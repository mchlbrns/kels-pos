'use client';

import { useState } from 'react';
import { db, type Customer } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { UserPlus, UserCheck, Search, X, User, UserX, Phone } from 'lucide-react';
import styles from './CustomerSelector.module.css';
import { addToSyncQueue } from '@/lib/sync';
import { v4 as uuidv4 } from 'uuid';

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
      id: uuidv4(),
      name: newName,
      phone: newPhone,
      points: 0,
      total_visits: 0,
      loyalty_id: `LOY-${Math.random().toString(36).substring(2, 11).toUpperCase()}`
    };
    await db.customers.add(newCustomer);
    await addToSyncQueue('CUSTOMER', newCustomer);
    onSelect(newCustomer);
    setIsAdding(false);
    setIsSearching(false);
    setNewName('');
    setNewPhone('');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={styles.container}>
      {selectedCustomer ? (
        <div className={styles.selected}>
          <div className={styles.info}>
            <UserCheck size={20} />
            <div className={styles.infoContent}>
              <span className={styles.infoName}>{selectedCustomer.name}</span>
              <span className={styles.infoPoints}>{selectedCustomer.points} pts</span>
            </div>
          </div>
          <button onClick={() => onSelect(null)} className={styles.remove} title="Remove Customer">
            <X size={16} />
          </button>
        </div>
      ) : (
        <button className={styles.placeholder} onClick={() => setIsSearching(true)}>
          <UserPlus size={20} />
          <span>Add / Select Customer</span>
        </button>
      )}

      {isSearching && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            {/* Modal Header */}
            <div className={styles.modalHeader}>
              <h3>
                <User size={20} className={styles.headerIcon} />
                Customer Lookup
              </h3>
              <button onClick={() => setIsSearching(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className={styles.modalBody}>
              {/* Search input box */}
              <div className={styles.searchBox}>
                <Search size={18} />
                <input 
                  placeholder="Search name or phone number..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Results list */}
              {searchTerm && (
                <div className={styles.results}>
                  {customers?.map(c => (
                    <button 
                      key={c.id} 
                      onClick={() => { onSelect(c); setIsSearching(false); }} 
                      className={styles.resultItem}
                    >
                      <div className={styles.resultLeft}>
                        <div className={styles.avatar}>
                          {getInitials(c.name)}
                        </div>
                        <div className={styles.resultInfo}>
                          <span className={styles.resultName}>{c.name}</span>
                          <span className={styles.resultPhone}>{c.phone || 'No phone'}</span>
                        </div>
                      </div>
                      <span className={styles.pointsBadge}>
                        {c.points} pts
                      </span>
                    </button>
                  ))}
                  {customers?.length === 0 && !isAdding && (
                    <div className={styles.noResults}>
                      <UserX size={32} />
                      <span className={styles.noResultsMain}>No customer found.</span>
                      <span className={styles.noResultsSub}>Try a different name or phone number</span>
                    </div>
                  )}
                </div>
              )}

              {isAdding && (
                <>
                  <div className={styles.divider}></div>
                  <form onSubmit={handleAddCustomer} className={styles.addForm}>
                    <div className={styles.formInputWrapper}>
                      <User size={16} />
                      <input 
                        placeholder="Customer Name" 
                        required 
                        value={newName} 
                        onChange={e => setNewName(e.target.value)} 
                      />
                    </div>
                    <div className={styles.formInputWrapper}>
                      <Phone size={16} />
                      <input 
                        placeholder="Phone Number (Optional)" 
                        value={newPhone} 
                        onChange={e => setNewPhone(e.target.value)} 
                      />
                    </div>
                    <button type="submit" className={styles.saveBtn}>
                      Save Customer
                    </button>
                  </form>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className={styles.modalFooter}>
              <button 
                type="button" 
                className={styles.toggleAddBtn} 
                onClick={() => setIsAdding(!isAdding)}
              >
                {isAdding ? '− Cancel' : '＋ Create New Customer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
