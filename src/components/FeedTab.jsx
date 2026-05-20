import React from 'react';
import GlobalChat from './GlobalChat';

export default function FeedTab({ currentUser, isAdmin }) {
  return (
    <div className="tab-content tab-content--chat">
      <GlobalChat currentUser={currentUser} isAdmin={isAdmin} alwaysExpanded={true} />
    </div>
  );
}
