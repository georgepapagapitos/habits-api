// Google Photos API types
export interface GooglePhoto {
  id: string;
  baseUrl: string;
  productUrl: string;
  mimeType: string;
  mediaMetadata: {
    creationTime: string;
    width: string;
    height: string;
  };
  filename: string;
}

export interface PhotoResponse {
  id: string;
  url: string;
  thumbnailUrl?: string; // Optional thumbnail URL for faster loading
  width: number;
  height: number;
}

export interface GoogleAlbum {
  id: string;
  title: string;
  productUrl: string;
  mediaItemsCount: string;
  coverPhotoBaseUrl?: string;
  coverPhotoMediaItemId?: string;
}

export interface AlbumResponse {
  id: string;
  title: string;
  itemCount: number;
  coverUrl?: string;
}
