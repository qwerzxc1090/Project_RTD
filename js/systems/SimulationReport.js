(function(root, factory) {
    var api = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.RTDSimulationReport = api;
}(typeof self !== 'undefined' ? self : this, function() {
    'use strict';

    var VERSION = 1;

    function number(value) {
        value = Number(value);
        return Number.isFinite(value) ? value : 0;
    }

    function round(value, digits) {
        var scale = Math.pow(10, digits === undefined ? 2 : digits);
        return Math.round(number(value) * scale) / scale;
    }

    function rate(count, total) {
        return total > 0 ? count / total * 100 : 0;
    }

    // Wilson score interval. Small DEV samples and large calculation samples can be
    // compared without presenting a point estimate as false precision.
    function proportionInterval(count, total) {
        if (total <= 0) return { low: 0, high: 0, margin: 0 };
        var z = 1.959963984540054;
        var p = count / total;
        var z2 = z * z;
        var denominator = 1 + z2 / total;
        var center = (p + z2 / (2 * total)) / denominator;
        var margin = z * Math.sqrt((p * (1 - p) + z2 / (4 * total)) / total) / denominator;
        return {
            low: round(Math.max(0, center - margin) * 100, 2),
            high: round(Math.min(1, center + margin) * 100, 2),
            margin: round(margin * 100, 2)
        };
    }

    function average(sum, count) {
        return count > 0 ? sum / count : 0;
    }

    function summarizeDev(results, totalRounds) {
        results = Array.isArray(results) ? results : [];
        totalRounds = number(totalRounds) || 52;
        var summary = emptySummary('dev', totalRounds);
        summary.total = results.length;
        results.forEach(function(result) {
            var win = !!result.win;
            var gs = number(result.gs);
            var resultRound = Math.max(1, Math.min(totalRounds, Math.floor(number(result.round) || 1)));
            summary.totalTime += number(result.time);
            addHp(summary, result.hpAvg);
            if (win) {
                summary.clears++;
                if (gs > 0) { summary.clearGsSum += gs; summary.clearGsCount++; }
            } else {
                summary.failures++;
                summary.failRoundSum += resultRound;
                summary.failCounts[resultRound]++;
                if (gs > 0) {
                    summary.failGsSum += gs;
                    summary.failGsCount++;
                    summary.failGsSums[resultRound] += gs;
                    summary.failGsCounts[resultRound]++;
                }
                if (result.failCategory === 'boss') summary.bossFails++;
                else summary.normalFails++;
                if (result.failReason === 'boss_timeout') summary.bossTimeouts++;
            }
        });
        return finalize(summary);
    }

    function summarizeCalculation(aggregate, totalRounds) {
        totalRounds = number(totalRounds) || 52;
        var summary = emptySummary('calculation', totalRounds);
        if (!aggregate) return finalize(summary);
        ['total', 'clears', 'failures', 'clearGsSum', 'clearGsCount', 'failGsSum',
            'failGsCount', 'failRoundSum', 'totalTime', 'normalFails', 'bossFails',
            'bossTimeouts'].forEach(function(field) { summary[field] = number(aggregate[field]); });
        for (var i = 1; i <= totalRounds; i++) {
            summary.failCounts[i] = number(aggregate.failCounts && aggregate.failCounts[i]);
            summary.failGsSums[i] = number(aggregate.failGsSums && aggregate.failGsSums[i]);
            summary.failGsCounts[i] = number(aggregate.failGsCounts && aggregate.failGsCounts[i]);
        }
        ['early', 'mid', 'late'].forEach(function(group) {
            summary.hpSums[group] = number(aggregate.hpSums && aggregate.hpSums[group]);
            summary.hpCounts[group] = number(aggregate.hpCounts && aggregate.hpCounts[group]);
        });
        summary.model = aggregate.model || null;
        summary.modelVersion = aggregate.version || null;
        summary.batches = number(aggregate.batches) || (summary.total > 0 ? 1 : 0);
        summary.completedAt = number(aggregate.completedAt) || null;
        summary.accuracyLevel = number(aggregate.assumptions && aggregate.assumptions.accuracyLevel) || null;
        summary.requestedIterations = number(aggregate.requestedIterations) || summary.total;
        summary.stoppedByTimeLimit = !!aggregate.stoppedByTimeLimit;
        summary.wallElapsedMs = number(aggregate.wallElapsedMs);
        summary.precisionLimitHits = number(aggregate.precisionLimitHits);
        return finalize(summary);
    }

    function emptySummary(source, totalRounds) {
        var size = totalRounds + 1;
        return {
            source: source, total: 0, clears: 0, failures: 0,
            clearGsSum: 0, clearGsCount: 0, failGsSum: 0, failGsCount: 0,
            failRoundSum: 0, totalTime: 0, normalFails: 0, bossFails: 0,
            bossTimeouts: 0, failCounts: new Array(size).fill(0),
            failGsSums: new Array(size).fill(0), failGsCounts: new Array(size).fill(0),
            hpSums: { early: 0, mid: 0, late: 0 },
            hpCounts: { early: 0, mid: 0, late: 0 }
        };
    }

    function addHp(summary, hpAvg) {
        if (!hpAvg) return;
        ['early', 'mid', 'late'].forEach(function(group) {
            if (Number.isFinite(Number(hpAvg[group]))) {
                summary.hpSums[group] += Number(hpAvg[group]);
                summary.hpCounts[group]++;
            }
        });
    }

    function finalize(summary) {
        summary.clearRatePct = round(rate(summary.clears, summary.total), 2);
        summary.clearRate95 = proportionInterval(summary.clears, summary.total);
        summary.averageFailureRound = round(average(summary.failRoundSum, summary.failures), 2);
        summary.averageTimeSec = round(average(summary.totalTime, summary.total), 2);
        summary.averageClearScore = round(average(summary.clearGsSum, summary.clearGsCount), 2);
        summary.averageFailureScore = round(average(summary.failGsSum, summary.failGsCount), 2);
        summary.averageHp = {};
        ['early', 'mid', 'late'].forEach(function(group) {
            summary.averageHp[group] = round(average(summary.hpSums[group], summary.hpCounts[group]), 2);
        });
        summary.topFailureRounds = summary.failCounts.map(function(count, roundNumber) {
            return roundNumber === 0 || count <= 0 ? null : {
                round: roundNumber,
                count: count,
                sharePct: round(rate(count, summary.failures), 2),
                averageScore: round(average(summary.failGsSums[roundNumber], summary.failGsCounts[roundNumber]), 2)
            };
        }).filter(Boolean).sort(function(a, b) { return b.count - a.count || a.round - b.round; }).slice(0, 10);
        return summary;
    }

    function compare(dev, calculation) {
        var clearRateGap = round(dev.clearRatePct - calculation.clearRatePct, 2);
        var intervalsOverlap = !(dev.clearRate95.high < calculation.clearRate95.low ||
            calculation.clearRate95.high < dev.clearRate95.low);
        var roundRows = [];
        var maxRounds = Math.max(dev.failCounts.length, calculation.failCounts.length);
        for (var i = 1; i < maxRounds; i++) {
            var devShare = rate(number(dev.failCounts[i]), dev.failures);
            var calcShare = rate(number(calculation.failCounts[i]), calculation.failures);
            if (devShare || calcShare) roundRows.push({
                round: i, devSharePct: round(devShare, 2), calculationSharePct: round(calcShare, 2),
                gapPp: round(devShare - calcShare, 2)
            });
        }
        roundRows.sort(function(a, b) { return Math.abs(b.gapPp) - Math.abs(a.gapPp); });
        var notes = [];
        if (!dev.total || !calculation.total) notes.push('두 시뮬레이션 중 하나에 표본이 없어 비교가 제한됩니다.');
        else if (intervalsOverlap) notes.push('클리어율의 95% 구간이 겹쳐 현재 표본만으로 뚜렷한 차이라고 단정하기 어렵습니다.');
        else notes.push('클리어율의 95% 구간이 겹치지 않아 두 모델의 결과 차이를 우선 점검해야 합니다.');
        if (dev.total > 0 && calculation.total / dev.total >= 20) {
            notes.push('계산 시뮬 표본이 DEV보다 매우 크므로 최종 판단은 DEV 표본의 오차범위를 기준으로 보수적으로 해석해야 합니다.');
        }
        return {
            clearRateGapPp: clearRateGap,
            clearRateIntervalsOverlap: intervalsOverlap,
            averageFailureRoundGap: round(dev.averageFailureRound - calculation.averageFailureRound, 2),
            averageTimeGapSec: round(dev.averageTimeSec - calculation.averageTimeSec, 2),
            averageClearScoreGap: round(dev.averageClearScore - calculation.averageClearScore, 2),
            averageFailureScoreGap: round(dev.averageFailureScore - calculation.averageFailureScore, 2),
            largestFailureDistributionGaps: roundRows.slice(0, 10),
            notes: notes
        };
    }

    function build(results, calculationAggregate, options) {
        options = options || {};
        var totalRounds = number(options.totalRounds) || 52;
        var dev = summarizeDev(results, totalRounds);
        var calculation = summarizeCalculation(calculationAggregate, totalRounds);
        return {
            schema: 'rtd-simulation-comparison', version: VERSION,
            generatedAt: new Date().toISOString(),
            dev: dev, calculation: calculation,
            comparison: compare(dev, calculation)
        };
    }

    return {
        VERSION: VERSION,
        build: build,
        summarizeDev: summarizeDev,
        summarizeCalculation: summarizeCalculation,
        compare: compare,
        proportionInterval: proportionInterval
    };
}));
