import React from 'react';
import GlobalChat from './GlobalChat';

export default function FeedTab({ currentUser, isAdmin }) {
  return (
    <div className="tab-content">
      <GlobalChat currentUser={currentUser} isAdmin={isAdmin} />
    </div>
  );
}
