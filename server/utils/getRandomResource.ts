import { RESOURCES_COLLECTION } from './constants';
import { db } from '../services/firebase';


export async function getRandomResource(groupType: string) {
    const snapshot = await db.collection(RESOURCES_COLLECTION).where(groupType, '==', false).get();
  
    let selected = null;
    let count = 0;
  
    for (const doc of snapshot.docs) {
      count++;
      if (Math.random() < 1 / count) {
        selected = doc;
      }
    }
  const data = selected?.data() || {};
  const { url, type, summary, fileName } = data;

  return {
    id: selected?.id,
    url,
    fileName,
    type,
    summary
  };
  }
