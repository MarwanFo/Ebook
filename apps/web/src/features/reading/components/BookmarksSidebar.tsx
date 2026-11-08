import React, { useState } from 'react';
import {
  X,
  Bookmark as BookmarkIcon,
  Search,
  Plus,
  Trash2,
  Edit2,
  Check,
  ExternalLink,
  Copy,
  Loader2,
} from 'lucide-react';
import { BookmarkDto, LocationType } from '@bookflow/shared-types';
import { useBookmarks } from '../hooks/useBookmarks';
import { useCreateBookmark } from '../hooks/useCreateBookmark';
import { useUpdateBookmark } from '../hooks/useUpdateBookmark';
import { useDeleteBookmark } from '../hooks/useDeleteBookmark';

interface BookmarksSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  bookId: string;
  bookTitle?: string;
  currentLocationType: LocationType;
  currentLocationValue: string;
  currentProgressPercentage: number;
  currentLabel?: string;
  onJumpToLocation: (locationType: LocationType, locationValue: string) => void;
  theme?: 'light' | 'sepia' | 'dark';
}

export const BookmarksSidebar: React.FC<BookmarksSidebarProps> = ({
  isOpen,
  onClose,
  bookId,
  bookTitle,
  currentLocationType,
  currentLocationValue,
  currentProgressPercentage,
  currentLabel,
  onJumpToLocation,
  theme = 'sepia',
}) => {
  const { data: bookmarks = [], isLoading } = useBookmarks(bookId);
  const createMutation = useCreateBookmark(bookId);
  const updateMutation = useUpdateBookmark(bookId);
  const deleteMutation = useDeleteBookmark(bookId);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Add Form State
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newNote, setNewNote] = useState('');

  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editNote, setEditNote] = useState('');

  // Copy Feedback
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const sidebarThemeClasses = {
    light: 'bg-white border-neutral-200 text-neutral-800',
    sepia: 'bg-[#fbf4e2] border-[#e4d5b7] text-[#4a3b2c]',
    dark: 'bg-[#181614] border-neutral-800 text-[#e4e2dd]',
  }[theme];

  const cardThemeClasses = {
    light: 'bg-neutral-50 border-neutral-200 hover:border-neutral-300',
    sepia: 'bg-[#f4ebd4] border-[#e2d5b6] hover:border-[#cfbe9a]',
    dark: 'bg-[#201e1b] border-neutral-800 hover:border-neutral-700',
  }[theme];

  const inputThemeClasses = {
    light: 'bg-white border-neutral-200 text-neutral-800 focus:border-primary',
    sepia: 'bg-[#faf4e4] border-[#d8c8a5] text-[#3d2e20] focus:border-[#8b6534]',
    dark: 'bg-[#121110] border-neutral-700 text-[#e4e2dd] focus:border-amber-400',
  }[theme];

  const filteredBookmarks = bookmarks.filter((b) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchesTitle = b.title?.toLowerCase().includes(q);
    const matchesNote = b.note?.toLowerCase().includes(q);
    const matchesLocation = b.locationValue.toLowerCase().includes(q);
    return matchesTitle || matchesNote || matchesLocation;
  });

  const handleStartAdd = () => {
    setNewTitle(currentLabel || `Bookmark at ${Math.round(currentProgressPercentage)}%`);
    setNewNote('');
    setIsAdding(true);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentLocationValue) return;

    await createMutation.mutateAsync({
      locationType: currentLocationType,
      locationValue: currentLocationValue,
      progressPercentage: currentProgressPercentage,
      title: newTitle.trim() || undefined,
      note: newNote.trim() || undefined,
    });

    setIsAdding(false);
    setNewTitle('');
    setNewNote('');
  };

  const handleStartEdit = (b: BookmarkDto) => {
    setEditingId(b.id);
    setEditTitle(b.title || '');
    setEditNote(b.note || '');
  };

  const handleSaveEdit = async (bookmarkId: string) => {
    await updateMutation.mutateAsync({
      bookmarkId,
      dto: {
        title: editTitle.trim() || undefined,
        note: editNote.trim() || undefined,
      },
    });
    setEditingId(null);
  };

  const handleDelete = async (bookmarkId: string) => {
    await deleteMutation.mutateAsync(bookmarkId);
  };

  const handleExportMarkdown = () => {
    const lines: string[] = [
      `# Bookmarks & Notes: ${bookTitle || 'Book'}`,
      `Exported: ${new Date().toLocaleDateString()}`,
      '',
    ];

    bookmarks.forEach((b, index) => {
      lines.push(
        `## ${index + 1}. ${b.title || 'Bookmark'} (${Math.round(b.progressPercentage)}%)`,
      );
      lines.push(`- **Location**: ${b.locationType} - \`${b.locationValue}\``);
      lines.push(`- **Date**: ${new Date(b.createdAt).toLocaleDateString()}`);
      if (b.note) {
        lines.push(`- **Note**:`);
        lines.push(`  > ${b.note.replace(/\n/g, '\n  > ')}`);
      }
      lines.push('');
    });

    const content = lines.join('\n');
    navigator.clipboard?.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatLocation = (b: BookmarkDto) => {
    if (b.locationType === LocationType.PDF_PAGE) {
      return `Page ${b.locationValue}`;
    }
    return `CFI`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none animate-fade-in">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={`absolute inset-y-0 right-0 max-w-full flex pl-10 transform transition-transform duration-300 ease-in-out`}
      >
        <div
          className={`w-screen max-w-md shadow-2xl flex flex-col border-l ${sidebarThemeClasses}`}
        >
          {/* Header */}
          <div className="p-4 border-b border-current/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600">
                <BookmarkIcon className="w-5 h-5 fill-current" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Bookmarks & Notes</h3>
                <p className="text-xs opacity-60">
                  {bookmarks.length} {bookmarks.length === 1 ? 'bookmark' : 'bookmarks'} saved
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {bookmarks.length > 0 && (
                <button
                  type="button"
                  onClick={handleExportMarkdown}
                  title="Copy notes as Markdown"
                  className="p-1.5 rounded-md hover:bg-current/10 text-xs flex items-center gap-1 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-600">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Export</span>
                    </>
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-md hover:bg-current/10 transition-colors"
                aria-label="Close bookmarks sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Add Section */}
          <div className="p-4 border-b border-current/10">
            {!isAdding ? (
              <button
                type="button"
                onClick={handleStartAdd}
                className="w-full py-2.5 px-3 rounded-lg border border-dashed border-current/20 hover:border-current/40 hover:bg-current/5 flex items-center justify-center gap-2 text-xs font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Bookmark Current Position ({Math.round(currentProgressPercentage)}%)</span>
              </button>
            ) : (
              <form onSubmit={handleSaveAdd} className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">New Bookmark</span>
                  <span className="text-xs opacity-60">
                    {Math.round(currentProgressPercentage)}%
                  </span>
                </div>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Bookmark title (optional)"
                  maxLength={200}
                  className={`w-full px-3 py-1.5 rounded-md text-xs border outline-none ${inputThemeClasses}`}
                  autoFocus
                />
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note or excerpt (optional)"
                  rows={2}
                  maxLength={2000}
                  className={`w-full px-3 py-1.5 rounded-md text-xs border outline-none resize-none ${inputThemeClasses}`}
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="px-3 py-1 text-xs rounded hover:bg-current/10 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="px-3 py-1 text-xs rounded bg-amber-600 hover:bg-amber-700 text-white font-medium transition-colors flex items-center gap-1"
                  >
                    {createMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                    Save
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Search Filter */}
          {bookmarks.length > 3 && (
            <div className="p-3 border-b border-current/10">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 opacity-40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search bookmarks and notes..."
                  className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-md border outline-none ${inputThemeClasses}`}
                />
              </div>
            </div>
          )}

          {/* Bookmarks List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 opacity-60 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-xs">Loading bookmarks...</span>
              </div>
            ) : filteredBookmarks.length === 0 ? (
              <div className="text-center py-12 px-4 opacity-60 space-y-2">
                <BookmarkIcon className="w-8 h-8 mx-auto stroke-1" />
                <p className="text-xs font-medium">
                  {searchQuery ? 'No matching bookmarks' : 'No bookmarks saved yet'}
                </p>
                <p className="text-[11px] max-w-xs mx-auto">
                  {searchQuery
                    ? 'Try different search terms'
                    : 'Use the button above to bookmark notable chapters, pages, or add personal notes.'}
                </p>
              </div>
            ) : (
              filteredBookmarks.map((b) => {
                const isEditing = editingId === b.id;

                return (
                  <div
                    key={b.id}
                    className={`p-3 rounded-lg border transition-all ${cardThemeClasses}`}
                  >
                    {/* Header Row */}
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300">
                          {formatLocation(b)}
                        </span>
                        <span className="text-[10px] opacity-60">
                          {Math.round(b.progressPercentage)}%
                        </span>
                      </div>
                      <span className="text-[10px] opacity-40">
                        {new Date(b.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Content / Edit Mode */}
                    {isEditing ? (
                      <div className="space-y-2 my-2">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="Title"
                          maxLength={200}
                          className={`w-full px-2 py-1 text-xs rounded border outline-none ${inputThemeClasses}`}
                        />
                        <textarea
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          placeholder="Note"
                          rows={2}
                          maxLength={2000}
                          className={`w-full px-2 py-1 text-xs rounded border outline-none resize-none ${inputThemeClasses}`}
                        />
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="px-2 py-0.5 text-[11px] rounded hover:bg-current/10"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(b.id)}
                            disabled={updateMutation.isPending}
                            className="px-2.5 py-0.5 text-[11px] rounded bg-amber-600 hover:bg-amber-700 text-white font-medium"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {b.title && (
                          <h4 className="text-xs font-semibold leading-snug mb-1">{b.title}</h4>
                        )}
                        {b.note && (
                          <p className="text-xs opacity-75 italic border-l-2 border-amber-500/40 pl-2 my-1 leading-relaxed whitespace-pre-wrap">
                            {b.note}
                          </p>
                        )}
                      </>
                    )}

                    {/* Actions Row */}
                    {!isEditing && (
                      <div className="flex items-center justify-between pt-2 mt-2 border-t border-current/10">
                        <button
                          type="button"
                          onClick={() => {
                            onJumpToLocation(b.locationType, b.locationValue);
                            onClose();
                          }}
                          className="flex items-center gap-1 text-[11px] font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Jump to location</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(b)}
                            title="Edit bookmark"
                            className="p-1 rounded hover:bg-current/10 opacity-60 hover:opacity-100 transition-opacity"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(b.id)}
                            disabled={deleteMutation.isPending}
                            title="Delete bookmark"
                            className="p-1 rounded hover:bg-red-500/10 text-red-500/80 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
