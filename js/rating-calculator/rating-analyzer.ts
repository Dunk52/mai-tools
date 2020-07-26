import {DIFFICULTIES} from '../common/constants';
import {getSongProperties, SongProperties} from '../common/inner-lv-util';
import {getSongNickname} from '../common/song-util';
import {compareSongsByRating} from './record-comparator';
import {ChartRecord, ChartRecordWithRating, RatingData} from './types';

const NUM_TOP_NEW_SONGS = 15;
const NUM_TOP_OLD_SONGS = 25;

/**
 * Compute rating value based on the chart level and player achievement.
 * If we don't find the inner level for the chart, use its estimated level and move on.
 */
export function analyzeSongRating(record: ChartRecord, songProps?: SongProperties): ChartRecordWithRating {
  if (songProps) {
    const lvIndex = DIFFICULTIES.indexOf(record.difficulty);
    const lv = songProps.lv[lvIndex];
    if (typeof lv === "number") {
      record.levelIsEstimate = lv < 0;
      record.level = Math.abs(lv);
    }
  }
  if (record.levelIsEstimate) {
    const debugName = (
      getSongNickname(record.songName, record.genre, record.chartType === "DX")
      + " - " + record.difficulty + " " + record.level
    );
    console.warn(`Missing inner lv data for ${debugName}`);
  }
  return {
    ...record,
    rating: record.level * record.multiplier,
  };
}

export async function analyzePlayerRating(
  songPropsByName: Map<string, ReadonlyArray<SongProperties>>,
  playerScores: ReadonlyArray<ChartRecord>,
  gameVersion: number
): Promise<RatingData> {
  const newChartRecords = [];
  const oldChartRecords = [];
  for (const record of playerScores) {
    const songProps = getSongProperties(
      songPropsByName,
      record.songName,
      record.genre,
      record.chartType
    );
    let isOldChart = record.chartType === "STANDARD";
    if (songProps) {
      // can differentiate between DX & DX Plus
      isOldChart = songProps.debut !== gameVersion;
    }
    const recordWithRating = analyzeSongRating(record, songProps);
    if (isOldChart) {
      oldChartRecords.push(recordWithRating);
    } else {
      newChartRecords.push(recordWithRating);
    }
  }

  newChartRecords.sort(compareSongsByRating);
  oldChartRecords.sort(compareSongsByRating);

  let newChartsRating = 0;
  const newTopChartsCount = Math.min(NUM_TOP_NEW_SONGS, newChartRecords.length);
  for (let i = 0; i < newTopChartsCount; i++) {
    newChartsRating += Math.floor(newChartRecords[i].rating);
  }

  let oldChartsRating = 0;
  const oldTopChartsCount = Math.min(NUM_TOP_OLD_SONGS, oldChartRecords.length);
  for (let i = 0; i < oldTopChartsCount; i++) {
    oldChartsRating += Math.floor(oldChartRecords[i].rating);
  }

  return {
    newChartRecords,
    newChartsRating,
    newTopChartsCount,
    oldChartRecords,
    oldChartsRating,
    oldTopChartsCount,
  };
}