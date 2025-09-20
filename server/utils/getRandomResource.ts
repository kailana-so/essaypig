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

    console.log(`[getRandomResource] Selected resource for ${groupType}:`, {
      id: selected.id,
      url,
      fileName,
      type,
      summary: summary ? 'present' : 'missing'
    });

    return {
      id: selected.id,
      url,
      fileName,
      type,
      summary
    };
  }

  export type Summary = {
    title: string;
    body: string;
    questions: { question1: string; question2: string };
  };

  export async function getSummary(groupType: string): Promise<{ id: string; summary: Summary }> {
    const snap = await db
      .collection(RESOURCES_COLLECTION)
      .where('current', 'array-contains', groupType) // use the arg
      .limit(1)
      .get();
  
    const doc = snap.docs[0];
    const summary = (doc.get('summary') as Summary);
    console.log(summary, "summary")
    return { id: doc.id, summary };
  }