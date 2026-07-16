import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { RoadmapItem, RoadmapDifficulty, RoadmapStatus } from "@/types/roadmap";

const ROADMAP_COLLECTION = "roadmap_items";

// Helper to format documents safely
function formatFirestoreDoc(docSnap: any): RoadmapItem {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    userId: data.userId || "",
    skillId: data.skillId || "",
    title: data.title || "",
    description: data.description || "",
    estimatedStudyTime: data.estimatedStudyTime || 0,
    difficulty: data.difficulty || "Beginner",
    status: data.status || "Not Started",
    order: data.order ?? 0,
    parentTopic: data.parentTopic || "",
    resourceLinks: data.resourceLinks || "",
    notes: data.notes || "",
    completionDate: data.completionDate || "",
    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  };
}

/**
 * Subscribes to roadmap items for a specific skill in real-time, ordered by 'order' ascending.
 */
export function subscribeRoadmapItems(
  userId: string,
  skillId: string,
  callback: (items: RoadmapItem[]) => void
) {
  const colRef = collection(db, ROADMAP_COLLECTION);
  const q = query(
    colRef,
    where("userId", "==", userId),
    where("skillId", "==", skillId)
  );

  return onSnapshot(
    q,
    (querySnapshot) => {
      const items = querySnapshot.docs.map(formatFirestoreDoc);
      // Sort client-side by order ascending
      const sorted = items.sort((a, b) => a.order - b.order);
      callback(sorted);
    },
    (error) => {
      console.error(`Error subscribing to roadmap for skill ${skillId}: `, error);
    }
  );
}

/**
 * Creates a single roadmap item
 */
export async function createRoadmapItem(
  userId: string,
  skillId: string,
  itemData: Omit<RoadmapItem, "id" | "userId" | "skillId" | "createdAt" | "updatedAt">
): Promise<void> {
  const colRef = collection(db, ROADMAP_COLLECTION);
  await addDoc(colRef, {
    ...itemData,
    userId,
    skillId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Updates an existing roadmap item
 */
export async function updateRoadmapItem(
  itemId: string,
  updates: Partial<Omit<RoadmapItem, "id" | "userId" | "skillId" | "createdAt" | "updatedAt">>
): Promise<void> {
  const docRef = doc(db, ROADMAP_COLLECTION, itemId);
  
  const finalUpdates: any = {
    ...updates,
    updatedAt: serverTimestamp(),
  };

  // If status is changed to Completed, add completionDate
  if (updates.status === "Completed") {
    finalUpdates.completionDate = new Date().toISOString();
  } else if (updates.status) {
    finalUpdates.completionDate = "";
  }

  await updateDoc(docRef, finalUpdates);
}

/**
 * Deletes a roadmap item
 */
export async function deleteRoadmapItem(itemId: string): Promise<void> {
  const docRef = doc(db, ROADMAP_COLLECTION, itemId);
  await deleteDoc(docRef);
}

/**
 * Updates the 'order' field of multiple roadmap items in a single Firestore Batch operation
 */
export async function reorderRoadmapItems(items: RoadmapItem[]): Promise<void> {
  const batch = writeBatch(db);
  
  items.forEach((item, index) => {
    const docRef = doc(db, ROADMAP_COLLECTION, item.id);
    batch.update(docRef, {
      order: index,
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();
}

/**
 * Duplicates a roadmap from one skill to another
 */
export async function duplicateRoadmap(
  userId: string,
  sourceSkillId: string,
  targetSkillId: string
): Promise<void> {
  const colRef = collection(db, ROADMAP_COLLECTION);
  const q = query(
    colRef,
    where("userId", "==", userId),
    where("skillId", "==", sourceSkillId)
  );

  const querySnapshot = await getDocs(q);
  const sourceItems = querySnapshot.docs.map(formatFirestoreDoc);
  
  if (sourceItems.length === 0) return;

  const batch = writeBatch(db);
  sourceItems.forEach((item) => {
    const newDocRef = doc(collection(db, ROADMAP_COLLECTION));
    batch.set(newDocRef, {
      userId,
      skillId: targetSkillId,
      title: item.title,
      description: item.description || "",
      estimatedStudyTime: item.estimatedStudyTime || 0,
      difficulty: item.difficulty || "Beginner",
      status: "Not Started", // reset duplicate status
      order: item.order,
      parentTopic: item.parentTopic || "",
      resourceLinks: item.resourceLinks || "",
      notes: item.notes || "",
      completionDate: "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();
}

// Preset templates catalog
export const ROADMAP_TEMPLATES: Record<
  string,
  Array<{ title: string; difficulty: RoadmapDifficulty; estimatedStudyTime: number }>
> = {
  python: [
    { title: "Variables & Naming Conventions", difficulty: "Beginner", estimatedStudyTime: 30 },
    { title: "Standard Data Types & Casting", difficulty: "Beginner", estimatedStudyTime: 45 },
    { title: "Arithmetic & Logic Operators", difficulty: "Beginner", estimatedStudyTime: 30 },
    { title: "Conditional Statements (if/else)", difficulty: "Beginner", estimatedStudyTime: 45 },
    { title: "Loops (while & for iteration)", difficulty: "Beginner", estimatedStudyTime: 60 },
    { title: "Functions & Scope Resolution", difficulty: "Intermediate", estimatedStudyTime: 60 },
    { title: "Modules & Importing Packages", difficulty: "Intermediate", estimatedStudyTime: 45 },
    { title: "File Operations & IO Streams", difficulty: "Intermediate", estimatedStudyTime: 60 },
    { title: "Object-Oriented Programming (OOP)", difficulty: "Advanced", estimatedStudyTime: 90 },
    { title: "Error & Exception Handling", difficulty: "Intermediate", estimatedStudyTime: 45 },
    { title: "Decorators & Wrapper Functions", difficulty: "Advanced", estimatedStudyTime: 60 },
    { title: "Generators & Yield Statements", difficulty: "Advanced", estimatedStudyTime: 60 },
    { title: "Asynchronous Coding (asyncio)", difficulty: "Advanced", estimatedStudyTime: 90 },
    { title: "Virtual Environments (venv/pip)", difficulty: "Beginner", estimatedStudyTime: 30 },
    { title: "FastAPI REST Server Integration", difficulty: "Advanced", estimatedStudyTime: 120 },
  ],
  nextjs: [
    { title: "Routing (Folder Structure)", difficulty: "Beginner", estimatedStudyTime: 60 },
    { title: "Layouts & Sub-nested views", difficulty: "Beginner", estimatedStudyTime: 45 },
    { title: "React Server Components (RSC)", difficulty: "Intermediate", estimatedStudyTime: 90 },
    { title: "Client Components & 'use client'", difficulty: "Intermediate", estimatedStudyTime: 60 },
    { title: "Data Fetching Patterns", difficulty: "Intermediate", estimatedStudyTime: 90 },
    { title: "Server Actions & Revalidation", difficulty: "Advanced", estimatedStudyTime: 90 },
    { title: "Firebase/Next-Auth Authentication", difficulty: "Advanced", estimatedStudyTime: 120 },
    { title: "Middleware Gatekeeper Rules", difficulty: "Advanced", estimatedStudyTime: 60 },
    { title: "SEO Metadata & OpenGraph", difficulty: "Intermediate", estimatedStudyTime: 45 },
    { title: "Deployment (Vercel & Node CLI)", difficulty: "Beginner", estimatedStudyTime: 45 },
  ],
  react: [
    { title: "JSX Syntax & Elements", difficulty: "Beginner", estimatedStudyTime: 30 },
    { title: "Functional Components structure", difficulty: "Beginner", estimatedStudyTime: 45 },
    { title: "Props and Unidirectional Data Flow", difficulty: "Beginner", estimatedStudyTime: 30 },
    { title: "State Management with useState", difficulty: "Beginner", estimatedStudyTime: 60 },
    { title: "Side Effects with useEffect hook", difficulty: "Intermediate", estimatedStudyTime: 90 },
    { title: "Global Context API Provider", difficulty: "Intermediate", estimatedStudyTime: 60 },
    { title: "Performance Hooks (useMemo, useCallback)", difficulty: "Advanced", estimatedStudyTime: 90 },
    { title: "Custom React Hooks creation", difficulty: "Advanced", estimatedStudyTime: 60 },
  ],
  ai_engineering: [
    { title: "Python Fundamentals review", difficulty: "Beginner", estimatedStudyTime: 60 },
    { title: "Third-party APIs & Requests", difficulty: "Beginner", estimatedStudyTime: 45 },
    { title: "Prompt Engineering & Few-Shot", difficulty: "Beginner", estimatedStudyTime: 60 },
    { title: "LLM Basics (Tokens & Temperature)", difficulty: "Beginner", estimatedStudyTime: 90 },
    { title: "Text Embeddings & Semantic Search", difficulty: "Intermediate", estimatedStudyTime: 90 },
    { title: "Vector Databases (Pinecone, Chroma)", difficulty: "Intermediate", estimatedStudyTime: 90 },
    { title: "Retrieval Augmented Generation (RAG)", difficulty: "Advanced", estimatedStudyTime: 120 },
    { title: "AI Agents & Autonomous Loops", difficulty: "Advanced", estimatedStudyTime: 150 },
    { title: "Model Context Protocol (MCP)", difficulty: "Advanced", estimatedStudyTime: 90 },
    { title: "n8n AI Workflow Automation", difficulty: "Intermediate", estimatedStudyTime: 120 },
    { title: "LangGraph Statecharts", difficulty: "Advanced", estimatedStudyTime: 150 },
    { title: "Deployment & LLM Monitoring", difficulty: "Intermediate", estimatedStudyTime: 60 },
  ],
};

/**
 * Apply a preset template to a newly created skill.
 */
export async function applyRoadmapTemplate(
  userId: string,
  skillId: string,
  templateKey: string
): Promise<void> {
  const topics = ROADMAP_TEMPLATES[templateKey];
  if (!topics) return;

  const batch = writeBatch(db);
  topics.forEach((topic, index) => {
    const newDocRef = doc(collection(db, ROADMAP_COLLECTION));
    batch.set(newDocRef, {
      userId,
      skillId,
      title: topic.title,
      description: "",
      estimatedStudyTime: topic.estimatedStudyTime,
      difficulty: topic.difficulty,
      status: "Not Started",
      order: index,
      parentTopic: "",
      resourceLinks: "",
      notes: "",
      completionDate: "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();
}

/**
 * Simulated AI generator that constructs custom structured learning roadmaps locally.
 * Generates 6-10 topics based on keywords in the skill name.
 */
export async function generateAIRoadmap(
  userId: string,
  skillId: string,
  skillName: string
): Promise<void> {
  const nameLower = skillName.toLowerCase();
  
  // Custom templates based on search query keywords
  let topics: Array<{ title: string; difficulty: RoadmapDifficulty; estimatedStudyTime: number }> = [];

  if (nameLower.includes("docker") || nameLower.includes("container") || nameLower.includes("kubernetes")) {
    topics = [
      { title: "Containers & Isolation Basics", difficulty: "Beginner", estimatedStudyTime: 45 },
      { title: "Writing Custom Dockerfiles", difficulty: "Beginner", estimatedStudyTime: 60 },
      { title: "Managing Images and Docker Hub", difficulty: "Beginner", estimatedStudyTime: 45 },
      { title: "Container Networks & Port Bindings", difficulty: "Intermediate", estimatedStudyTime: 60 },
      { title: "Persistent Storage with Volumes", difficulty: "Intermediate", estimatedStudyTime: 60 },
      { title: "Multi-container Apps with Compose", difficulty: "Intermediate", estimatedStudyTime: 90 },
      { title: "Docker Security & User Privileges", difficulty: "Advanced", estimatedStudyTime: 60 },
      { title: "CI/CD Integration & Deployments", difficulty: "Advanced", estimatedStudyTime: 90 },
    ];
  } else if (nameLower.includes("sql") || nameLower.includes("postgres") || nameLower.includes("database") || nameLower.includes("mongo")) {
    topics = [
      { title: "Relational vs NoSQL database designs", difficulty: "Beginner", estimatedStudyTime: 45 },
      { title: "SQL Syntax: SELECT, WHERE, JOINs", difficulty: "Beginner", estimatedStudyTime: 60 },
      { title: "Database Normalization (1NF, 2NF, 3NF)", difficulty: "Intermediate", estimatedStudyTime: 90 },
      { title: "Indexing and Query Optimization", difficulty: "Advanced", estimatedStudyTime: 90 },
      { title: "ACID Transactions & Lock isolation", difficulty: "Advanced", estimatedStudyTime: 90 },
      { title: "Backup, Replication & Scaling setups", difficulty: "Intermediate", estimatedStudyTime: 60 },
    ];
  } else if (nameLower.includes("css") || nameLower.includes("tailwind") || nameLower.includes("design") || nameLower.includes("styling")) {
    topics = [
      { title: "HTML Semantic elements & CSS Basics", difficulty: "Beginner", estimatedStudyTime: 45 },
      { title: "CSS Box Model & Display properties", difficulty: "Beginner", estimatedStudyTime: 45 },
      { title: "Flexbox Layout arrangements", difficulty: "Beginner", estimatedStudyTime: 60 },
      { title: "CSS Grid layouts & Responsive Media Queries", difficulty: "Intermediate", estimatedStudyTime: 90 },
      { title: "Tailwind Utility classes utility flow", difficulty: "Intermediate", estimatedStudyTime: 60 },
      { title: "CSS Custom Variables & Theme management", difficulty: "Intermediate", estimatedStudyTime: 60 },
      { title: "Advanced Animations & Transitions", difficulty: "Advanced", estimatedStudyTime: 90 },
    ];
  } else if (nameLower.includes("git") || nameLower.includes("github")) {
    topics = [
      { title: "Version Control Concepts", difficulty: "Beginner", estimatedStudyTime: 30 },
      { title: "Git Basics: Init, Add, Commit, Push", difficulty: "Beginner", estimatedStudyTime: 45 },
      { title: "Branching & Merging Strategy", difficulty: "Beginner", estimatedStudyTime: 60 },
      { title: "Resolving Merge Conflicts", difficulty: "Intermediate", estimatedStudyTime: 60 },
      { title: "Rebasing & Interactive Squash", difficulty: "Advanced", estimatedStudyTime: 90 },
      { title: "Forking & Pull Request reviews", difficulty: "Intermediate", estimatedStudyTime: 45 },
    ];
  } else {
    // Default general template for custom skill name
    topics = [
      { title: `${skillName} Core Fundamentals`, difficulty: "Beginner", estimatedStudyTime: 45 },
      { title: `Environment Setup & Configuration`, difficulty: "Beginner", estimatedStudyTime: 60 },
      { title: `Key Syntax & Language Semantics`, difficulty: "Beginner", estimatedStudyTime: 60 },
      { title: `Core API & Practical Exercises`, difficulty: "Intermediate", estimatedStudyTime: 90 },
      { title: `State, Data, or Structure Management`, difficulty: "Intermediate", estimatedStudyTime: 90 },
      { title: `Error Handling & Debugging setups`, difficulty: "Intermediate", estimatedStudyTime: 60 },
      { title: `Testing & Automation checks`, difficulty: "Advanced", estimatedStudyTime: 90 },
      { title: `Best Practices & Optimization`, difficulty: "Advanced", estimatedStudyTime: 90 },
      { title: `Deployment & Production launch`, difficulty: "Advanced", estimatedStudyTime: 60 },
    ];
  }

  const batch = writeBatch(db);
  topics.forEach((topic, index) => {
    const newDocRef = doc(collection(db, ROADMAP_COLLECTION));
    batch.set(newDocRef, {
      userId,
      skillId,
      title: topic.title,
      description: `Generated AI curriculum step for ${skillName}.`,
      estimatedStudyTime: topic.estimatedStudyTime,
      difficulty: topic.difficulty,
      status: "Not Started",
      order: index,
      parentTopic: "",
      resourceLinks: "",
      notes: "",
      completionDate: "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();
}
