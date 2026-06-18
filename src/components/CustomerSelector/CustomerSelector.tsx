'use client';

import { useState } from 'react';
import { db, type Customer } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { UserPlus, UserCheck, Search, X } from 'lucide-react';
import styles from './CustomerSelector.module.css';
import { addToSyncQueue } from '@/lib/sync';

interface Props {
  selectedCustomer: Customer | null;
  onSelect: (customer: Customer | null) => void;
}

export default function CustomerSelector({ selectedCustomer, onSelect }: Props) {
  const [isSearching, setIsSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const customers = useLiveQuery(() => 
    searchTerm ? db.customers.where('name').startsWithIgnoreCase(searchTerm).or('phone').startsWith(searchTerm).toArray() : []
  , [searchTerm]);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const newCustomer: Customer = {
      id: crypto.randomUUID(),
      name: newName,
      phone: newPhone,
      points: 0
    };
    await db.customers.add(newCustomer);
    await addToSyncQueue('CUSTOMER', newCustomer);
    onSelect(newCustomer);
    setIsAdding(false);
    setIsSearching(false);
    setNewName('');
    setNewPhone('');
  };

  return (
    <div className={styles.container}>
      {selectedCustomer ? (
        <div className={styles.selected}>
          <div className={styles.info}>
            <UserCheck size={20} />
            <div>
              <strong>{selectedCustomer.name}</strong>
              <span>{selectedCustomer.points} Points</span>
            </div>
          </div>
          <button onClick={() => onSelect(null)} className={styles.remove}>
            <X size={16} />
          </button>
        </div>
      ) : (
        <button className={styles.placeholder} onClick={() => setIsSearching(true)}>
          <UserPlus size={20} />
          <span>Add/Select Customer</span>
        </button>
      )}

      {isSearching && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Customer Lookup</h3>
              <button onClick={() => setIsSearching(false)}><X /></button>
            </div>

            <div className={styles.searchBox}>
              <Search size={18} />
              <input 
                placeholder="Search name or phone..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>

            <div className={styles.results}>
              {customers?.map(c => (
                <button key={c.id} onClick={() => { onSelect(c); setIsSearching(false); }} className={styles.resultItem}>
                  <strong>{c.name}</strong>
                  <span>{c.phone || 'No phone'}</span>
                </button>
              ))}
              {searchTerm && customers?.length === 0 && !isAdding && (
                <p className={styles.noResults}>No customer found.</p>
              )}
            </div>

            {!isAdding ? (
              <button className={styles.toggleAdd} onClick={() => setIsAdding(true)}>
                + Create New Customer
              </button>
            ) : (
              <form onSubmit={handleAddCustomer} className={styles.addForm}>
                <input placeholder="Customer Name" required value={newName} onChange={e => setNewName(e.target.value)} />
                <input placeholder="Phone Number (Optional)" value={newPhone} onChange={e => setNewPhone(e.target.value)} />
                <div className={styles.formButtons}>
                  <button type="button" onClick={() => setIsAdding(false)}>Cancel</button>
                  <button type="submit" className={styles.submit}>Save Customer</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
