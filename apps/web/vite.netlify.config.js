import base from './vite.config.js';

export default {
  ...base,
  define:{...(base.define??{}),__PI_LOCAL_INVESTMENT__:true}
};
