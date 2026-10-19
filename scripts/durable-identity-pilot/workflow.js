// V1 remains offline-only; V2 supplies its own separately verified local adapter.
import '../../src/analysis/offline.js';
import {isQueryDouble} from './query-double.js';
import {persistSyntheticSequence} from './sequence.js';
export async function runSyntheticSequence(options){
  if(!isQueryDouble(options.db))throw new Error('ISOLATED_DATABASE_NOT_VERIFIED');
  return persistSyntheticSequence(options);
}
