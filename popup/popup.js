document.addEventListener('DOMContentLoaded', function() {
  // Get DOM elements
  const noteContentElement = document.getElementById('note-content');
  const saveNoteButton = document.getElementById('save-note');
  const clearNoteButton = document.getElementById('clear-note');
  const notesContainer = document.getElementById('notes-container');
  const searchInput = document.getElementById('search-notes');
  const clearSearchButton = document.getElementById('clear-search');
  
  // Store all notes
  let allNotes = [];
  
  // Load existing notes
  loadNotes();
  
  // Add event listeners
  saveNoteButton.addEventListener('click', saveNote);
  clearNoteButton.addEventListener('click', clearNoteInput);
  searchInput.addEventListener('input', performSearch);
  clearSearchButton.addEventListener('click', clearSearch);
  
  function saveNote() {
    const content = noteContentElement.value.trim();
    
    if (!content) {
      return; // Don't save empty notes
    }
    
    // Create new note object
    const note = {
      id: Date.now(), // Use timestamp as ID
      content: content,
      timestamp: new Date().toLocaleString()
    };
    
    // Get existing notes from storage
    chrome.storage.sync.get(['notes'], function(result) {
      const notes = result.notes || [];
      
      // Add new note
      notes.unshift(note); // Add to beginning of array
      allNotes = notes; // Update local copy
      
      // Save back to storage
      chrome.storage.sync.set({ notes: notes }, function() {
        // Update display
        renderNotes(notes);
        
        // Clear input
        clearNoteInput();
        
        // Clear search if active
        clearSearch();
      });
    });
  }
  
  function loadNotes() {
    chrome.storage.sync.get(['notes'], function(result) {
      const notes = result.notes || [];
      allNotes = notes; // Store for searching
      renderNotes(notes);
    });
  }
  
  function renderNotes(notes, searchTerm = '') {
    // Clear container
    notesContainer.innerHTML = '';
    
    if (notes.length === 0) {
      const message = searchTerm 
        ? `No notes found for "${searchTerm}".` 
        : 'No notes yet.';
      
      notesContainer.innerHTML = `<div class="empty-state">${message}</div>`;
      return;
    }
    
    // Add each note to container
    notes.forEach(function(note) {
      const noteElement = document.createElement('div');
      noteElement.className = 'note-item';
      
      let noteContent = escapeHtml(note.content);
      
      // Highlight search term if provided
      if (searchTerm) {
        const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');
        noteContent = noteContent.replace(regex, '<span class="highlight">$1</span>');
      }
      
      noteElement.innerHTML = `
        <div class="note-text">${noteContent}</div>
        <div class="note-date">${note.timestamp}</div>
        <button class="delete-note" data-id="${note.id}">×</button>
      `;
      
      notesContainer.appendChild(noteElement);
    });
    
    // Add delete button event listeners
    document.querySelectorAll('.delete-note').forEach(button => {
      button.addEventListener('click', deleteNote);
    });
  }
  
  function deleteNote(event) {
    const noteId = parseInt(event.target.getAttribute('data-id'));
    
    chrome.storage.sync.get(['notes'], function(result) {
      const notes = result.notes || [];
      
      // Filter out the note to delete
      const updatedNotes = notes.filter(note => note.id !== noteId);
      allNotes = updatedNotes; // Update local copy
      
      // Save back to storage
      chrome.storage.sync.set({ notes: updatedNotes }, function() {
        // If search is active, re-perform search
        if (searchInput.value.trim()) {
          performSearch();
        } else {
          renderNotes(updatedNotes);
        }
      });
    });
  }
  
  function performSearch() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    
    if (!searchTerm) {
      renderNotes(allNotes);
      return;
    }
    
    // Filter notes based on search term
    const filteredNotes = allNotes.filter(note => 
      note.content.toLowerCase().includes(searchTerm)
    );
    
    // Render filtered notes with highlighting
    renderNotes(filteredNotes, searchTerm);
  }
  
  function clearSearch() {
    searchInput.value = '';
    renderNotes(allNotes);
    searchInput.focus();
  }
  
  function clearNoteInput() {
    noteContentElement.value = '';
    noteContentElement.focus();
  }
  
  // Helper function to escape HTML to prevent XSS
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  // Helper function to escape special characters in search term for regex
  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
});