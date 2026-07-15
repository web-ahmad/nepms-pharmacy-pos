'use client';
import { Image } from 'lucide-react';
import { PlaceholderPage } from '../PlaceholderPage';

export default function MediaLibraryPage() {
  return (
    <PlaceholderPage
      icon={Image}
      title="Media Library"
      description="Upload and manage global media assets, pharmacy logos, banners, and promotional images."
      accent="#8b5cf6"
    />
  );
}
