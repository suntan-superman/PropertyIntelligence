import {createApi} from './router.js';
import {createLiveService} from './live.js';
import {resolveCached as search} from '../search.js';
import {loadFixture,searchInput} from '../fixtureRepository.js';
import {memoryStore} from '../../sources/rentcast/stores.js';
import {publicMapConfig} from '../mapConfig.js';

export function createRuntime({runtime='netlify',env={},store=memoryStore(),fixtureLoader=loadFixture,searchResolver,mapConfig,reportService,fetchImpl}={}){
  const resolveCached=searchResolver??((address,mode)=>search(address,mode,{input:searchInput,loadFixture:fixtureLoader}));
  const live=createLiveService({env,store,resolveCached,loadFixture:fixtureLoader,fetchImpl});
  return createApi({runtime,loadFixture:fixtureLoader,resolveCached,live,mapConfig:mapConfig??(()=>publicMapConfig(env)),reportService});
}
