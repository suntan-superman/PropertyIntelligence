import {createApi} from './router.js';
import {createLiveService} from './live.js';
import {resolveCached as search} from '../search.js';
import {loadFixture,searchInput} from '../fixtureRepository.js';
import {memoryStore} from '../../sources/rentcast/stores.js';
import {publicMapConfig} from '../mapConfig.js';
import {createDatabase} from '../../persistence/db.js';

export function createRuntime({runtime='netlify',env={},store=memoryStore(),fixtureLoader=loadFixture,searchResolver,mapConfig,reportService,fetchImpl}={}){
  const resolveCached=searchResolver??((address,mode)=>search(address,mode,{input:searchInput,loadFixture:fixtureLoader}));
  const live=createLiveService({env,store,resolveCached,loadFixture:fixtureLoader,fetchImpl});
  const db=createDatabase({connectionString:env.DATABASE_URL,env});
  return createApi({runtime,loadFixture:fixtureLoader,resolveCached,live,mapConfig:mapConfig??(()=>publicMapConfig(env)),reportService,persistence:db});
}
