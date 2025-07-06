import { RESOURCES_COLLECTION } from './constants';
import { db } from '../services/firebase';


export async function getRandomResource(groupType: string) {
    const snapshot = await db.collection(RESOURCES_COLLECTION).where(groupType, '==', false).get();
  
    if (snapshot.empty) {
      console.log(`[getRandomResource] No resources found for group: ${groupType}`);
      return null;
    }
  
    let selected = null;
    let count = 0;
  
    for (const doc of snapshot.docs) {
      count++;
      if (Math.random() < 1 / count) {
        selected = doc;
      }
    }
  
    if (!selected) {
      console.log(`[getRandomResource] No resource selected for group: ${groupType}`);
      return null;
    }
  
    const data = selected.data();
    const { url, type, summary, fileName } = data;

    return {
      id: selected.id,
      url,
      fileName,
      type,
      summary
    };
  }
