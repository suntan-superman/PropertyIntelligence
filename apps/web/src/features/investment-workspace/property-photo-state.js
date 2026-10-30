export function mergeActivePhotoUpdate(photos,updatedPhoto,patch={}){
  const current=Array.isArray(photos)?photos:[];
  if(!updatedPhoto?.id)return current;
  if(patch.removed===true||updatedPhoto.deletedAt)return current.filter(photo=>photo.id!==updatedPhoto.id);
  return current.map(photo=>photo.id===updatedPhoto.id?updatedPhoto:patch.isCover?{...photo,isCover:false}:photo);
}
