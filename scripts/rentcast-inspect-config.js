import { loadLocalEnvironment, configuration } from '../src/sources/rentcast/config.js';
try {
  loadLocalEnvironment();
  configuration();
  console.log('RentCast configuration present. Secret values omitted. Official host only; 6-call run budget; 15-second timeout.');
} catch {
  console.error('CONFIGURATION_STOP: populate RENTCAST_API_KEY in process environment or C:/Users/sjroy/Source/PropertyIntelligence/.env.');
  process.exitCode = 1;
}
