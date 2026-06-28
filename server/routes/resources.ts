import { Router } from 'express';
import { db } from '../services/firebase';
import { RESOURCES_COLLECTION } from '../utils/constants';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const snapshot = await db.collection(RESOURCES_COLLECTION)
      .orderBy('created_at', 'desc')
      .get();

    const resources = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.summary?.title ?? '',
        synopsis: data.summary?.body ?? '',
        type: data.type,
        url: data.url ?? null,
        fileUrl: data.fileUrl ?? null,
        created_at: data.created_at?.toDate?.() ?? null,
      };
    });

    res.json(resources);
  } catch (err) {
    console.error('[resources] Failed to fetch resources:', err);
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
});

export default router;
