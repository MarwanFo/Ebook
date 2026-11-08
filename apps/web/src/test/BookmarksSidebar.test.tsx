import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LocationType } from '@bookflow/shared-types';
import { BookmarksSidebar } from '../features/reading/components/BookmarksSidebar';
import { bookmarksApi } from '../features/reading/services/bookmarks-api';

vi.mock('../features/reading/services/bookmarks-api', () => ({
  bookmarksApi: {
    getBookmarks: vi.fn(),
    createBookmark: vi.fn(),
    updateBookmark: vi.fn(),
    deleteBookmark: vi.fn(),
  },
}));

describe('BookmarksSidebar', () => {
  let queryClient: QueryClient;

  const mockBookmarks = [
    {
      id: 'bmk-1',
      userId: 'u-1',
      bookId: 'b-1',
      locationType: LocationType.PDF_PAGE,
      locationValue: '15',
      progressPercentage: 30.0,
      title: 'Chapter 2 Key Quote',
      note: 'A memorable quote about life',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.mocked(bookmarksApi.getBookmarks).mockResolvedValue(mockBookmarks);
  });

  const renderComponent = (props: Partial<React.ComponentProps<typeof BookmarksSidebar>> = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BookmarksSidebar
          isOpen={true}
          onClose={vi.fn()}
          bookId="b-1"
          bookTitle="Test Book"
          currentLocationType={LocationType.PDF_PAGE}
          currentLocationValue="15"
          currentProgressPercentage={30}
          currentLabel="Page 15"
          onJumpToLocation={vi.fn()}
          theme="sepia"
          {...props}
        />
      </QueryClientProvider>,
    );
  };

  it('renders bookmarks list with titles and notes', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Bookmarks & Notes')).toBeInTheDocument();
      expect(screen.getByText('Chapter 2 Key Quote')).toBeInTheDocument();
      expect(screen.getByText('A memorable quote about life')).toBeInTheDocument();
    });
  });

  it('triggers onJumpToLocation when Jump to location is clicked', async () => {
    const onJumpToLocation = vi.fn();
    const onClose = vi.fn();
    renderComponent({ onJumpToLocation, onClose });

    await waitFor(() => {
      expect(screen.getByText('Jump to location')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Jump to location'));
    expect(onJumpToLocation).toHaveBeenCalledWith(LocationType.PDF_PAGE, '15');
    expect(onClose).toHaveBeenCalled();
  });

  it('creates a new bookmark when form is submitted', async () => {
    const user = userEvent.setup();
    vi.mocked(bookmarksApi.createBookmark).mockResolvedValue({
      id: 'bmk-new',
      userId: 'u-1',
      bookId: 'b-1',
      locationType: LocationType.PDF_PAGE,
      locationValue: '15',
      progressPercentage: 30,
      title: 'New Bookmark Title',
      note: 'Note text',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Bookmark Current Position/)).toBeInTheDocument();
    });

    await user.click(screen.getByText(/Bookmark Current Position/));

    const titleInput = screen.getByPlaceholderText('Bookmark title (optional)');
    await user.clear(titleInput);
    await user.type(titleInput, 'New Bookmark Title');

    const saveButton = screen.getByRole('button', { name: /Save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(bookmarksApi.createBookmark).toHaveBeenCalledWith(
        'b-1',
        expect.objectContaining({
          locationType: LocationType.PDF_PAGE,
          locationValue: '15',
          title: 'New Bookmark Title',
        }),
      );
    });
  });
});
