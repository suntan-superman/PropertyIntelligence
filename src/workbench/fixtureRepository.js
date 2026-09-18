import bundle from './fixtures.generated.js';

export const searchInput=bundle.searchInput;
export async function loadFixture(id,mode='deal'){
  if(!['fantasia','bass','joyce'].includes(id)||!['property','deal'].includes(mode))throw new Error('INVALID_FIXTURE');
  return structuredClone(bundle.fixtures[id][mode]);
}
