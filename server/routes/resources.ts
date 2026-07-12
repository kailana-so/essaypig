import { Router } from 'express';
import { db } from '../services/firebase';
import { presignRead } from '../services/s3';
import { requireAuth } from '../middleware/requireAuth';
import { RESOURCES_COLLECTION, NK_GROUP, TYPE_PDF, TYPE_EPUB } from '../utils/constants';

const router = Router();

// `current` is the group's text this fortnight; `nk` without `current` is one
// they've already read.
const isActive = (data: FirebaseFirestore.DocumentData) =>
  ((data.current ?? []) as string[]).includes(NK_GROUP);

const isCompleted = (data: FirebaseFirestore.DocumentData) =>
  data.nk === true && !isActive(data);

router.get('/', async (_req, res) => {
  try {
    const snapshot = await db.collection(RESOURCES_COLLECTION)
      .orderBy('created_at', 'desc')
      .get();

    const resources = snapshot.docs.map(doc => {
      const data = doc.data();
      // No bodyText: it holds the article verbatim and must not reach the browser
      return {
        id: doc.id,
        title: data.summary?.title ?? '',
        synopsis: data.summary?.body ?? '',
        type: data.type,
        url: data.url ?? null,
        active: isActive(data),
        completed: isCompleted(data),
        created_at: data.created_at?.toDate?.() ?? null,
      };
    });

    res.json(resources);
  } catch (err) {
    console.error('[resources] Failed to fetch resources:', err);
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
});

// Presigned read URL for an essay's file. Essay uploads use a flat key, so the
// per-user /api/library route can't serve them.
router.get('/read', requireAuth, async (req, res) => {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing id' });
  }

  try {
    const doc = await db.collection(RESOURCES_COLLECTION).doc(id).get();
    const data = doc.data();

    if (!doc.exists || !data) {
      return res.status(404).json({ error: 'No such essay' });
    }

    // Only texts the group has been sent are readable
    if (data.nk !== true) {
      return res.status(403).json({ error: 'Not released yet' });
    }

    if (data.type !== TYPE_PDF && data.type !== TYPE_EPUB) {
      return res.status(400).json({ error: 'Links open at the source' });
    }

    const url = await presignRead(data.fileName);
    return res.json({ url });
  } catch (err) {
    console.error('[resources] Read URL error:', err);
    return res.status(500).json({ error: 'Couldn\'t generate URL' });
  }
});

export default router;
