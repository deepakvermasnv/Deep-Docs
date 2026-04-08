import { 
  doc, 
  updateDoc, 
  getDoc, 
  serverTimestamp,
  Firestore
} from 'firebase/firestore';

export interface DocumentData {
  title: string;
  content: string;
  comments?: any[];
  updatedAt?: any;
}

/**
 * Saves document content to Firestore
 */
export const saveDocument = async (
  db: Firestore,
  userId: string,
  docId: string,
  data: Partial<DocumentData>
) => {
  try {
    const docRef = doc(db, 'users', userId, 'docs', docId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error saving document:', error);
    throw error;
  }
};

/**
 * Fetches a document from Firestore
 */
export const fetchDocument = async (
  db: Firestore,
  userId: string,
  docId: string
) => {
  try {
    const docRef = doc(db, 'users', userId, 'docs', docId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as DocumentData & { id: string };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error fetching document:', error);
    throw error;
  }
};
