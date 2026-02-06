const DB_NAME = 'homeorganizer';
const DB_VERSION = 3;
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      try {
        if (!db.objectStoreNames.contains('tasks')) db.createObjectStore('tasks', { keyPath: 'id', autoIncrement: true });
        const tasksStore = req.transaction.objectStore('tasks');
        if (tasksStore && !tasksStore.indexNames.contains('nextDue')) tasksStore.createIndex('nextDue', 'nextDue', { unique: false });
      } catch (e) { console.error('Migration error tasks:', e); }

      try {
        if (!db.objectStoreNames.contains('dailyPlans')) db.createObjectStore('dailyPlans', { keyPath: 'date' });
        if (!db.objectStoreNames.contains('streaks')) db.createObjectStore('streaks', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' });
        if (!db.objectStoreNames.contains('learningPatterns')) db.createObjectStore('learningPatterns', { keyPath: 'id', autoIncrement: true });
        if (!db.objectStoreNames.contains('taskSwaps')) db.createObjectStore('taskSwaps', { keyPath: 'id', autoIncrement: true });
      } catch (e) { console.error('Migration error stores:', e); }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function tx(store, mode) {
  return openDB().then(db => db.transaction(store, mode).objectStore(store));
}
function put(store, value) {
  return tx(store, 'readwrite').then(s => new Promise((resolve, reject) => { const r = s.put(value); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); }));
}
function add(store, value) {
  return tx(store, 'readwrite').then(s => new Promise((resolve, reject) => { const r = s.add(value); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); }));
}
function get(store, key) {
  return tx(store, 'readonly').then(s => new Promise((resolve, reject) => { const r = s.get(key); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); }));
}
function del(store, key) {
  return tx(store, 'readwrite').then(s => new Promise((resolve, reject) => { const r = s.delete(key); r.onsuccess = () => resolve(); r.onerror = () => reject(r.error); }));
}
function list(store) {
  return tx(store, 'readonly').then(s => new Promise((resolve, reject) => { const r = s.getAll(); r.onsuccess = () => resolve(r.result || []); r.onerror = () => reject(r.error); }));
}
function listByIndexRange(store, indexName, range) {
  return tx(store, 'readonly').then(
    s =>
      new Promise((resolve, reject) => {
        let idx;
        try {
          idx = s.index(indexName);
        } catch (e) {
          reject(e);
          return;
        }
        const r = idx.getAll(range);
        r.onsuccess = () => resolve(r.result || []);
        r.onerror = () => reject(r.error);
      })
  );
}
function clearStore(store) {
  return tx(store, 'readwrite').then(s => new Promise((resolve, reject) => { const r = s.clear(); r.onsuccess = () => resolve(); r.onerror = () => reject(r.error); }));
}
const db = {
  tasks: {
    add(v) { return add('tasks', v); },
    put(v) { return put('tasks', v); },
    get(id) { return get('tasks', id); },
    del(id) { return del('tasks', id); },
    list() { return list('tasks'); },
    listDueThrough(dateKey) { return listByIndexRange('tasks', 'nextDue', IDBKeyRange.upperBound(dateKey)); },
    clear() { return clearStore('tasks'); }
  },
  dailyPlans: {
    put(v) { return put('dailyPlans', v); },
    get(date) { return get('dailyPlans', date); },
    list() { return list('dailyPlans'); },
    clear() { return clearStore('dailyPlans'); }
  },
  streaks: {
    put(v) { return put('streaks', v); },
    get(id) { return get('streaks', id); },
    list() { return list('streaks'); },
    clear() { return clearStore('streaks'); }
  },
  settings: {
    put(v) { return put('settings', v); },
    get(key) { return get('settings', key); },
    list() { return list('settings'); },
    clear() { return clearStore('settings'); }
  },
  learningPatterns: {
    add(v) { return add('learningPatterns', v); },
    list() { return list('learningPatterns'); },
    clear() { return clearStore('learningPatterns'); }
  },
  taskSwaps: {
    add(v) { return add('taskSwaps', v); },
    list() { return list('taskSwaps'); },
    clear() { return clearStore('taskSwaps'); }
  }
};
window.HomeDB = db;
