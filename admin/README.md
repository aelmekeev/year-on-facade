# Year on Facade Admin Tool

This is a local, internal web-based admin interface designed for maintainers of the Year on Facade collection. It accelerates the workflow for parsing new photos, managing coordinates, and publishing batch updates.

## Features

- **Inbox Processing**: Reads unorganized photos from `photos/inbox/`, intelligently grouping them by timestamp.
- **EXIF Extraction**: Automatically extracts GPS coordinates from the photos' metadata.
- **Smart Geocoding**: Automatically determines the correct City and Country using boundaries defined in `utils/configs.json`.
- **Auto-Fill from TODOs**: Automatically resolves ties for overlapping cities and auto-fills external heritage IDs if the coordinates match an existing `TODO` entry within a 500m radius.
- **CSV Management**: Directly appends, sorts, and saves to the local CSV datasets without manual editing.
- **Batch Publishing**: Automatically pushes photos to S3, stages CSV changes, generates a detailed PR description (`pr-body.txt`), and prepares the git branch for publishing.

## Getting Started

1. **Prerequisites**: Ensure you have Node.js installed.
2. **Environment Setup**: Create an `.env` file in the `admin/` directory with your Google Maps API key:
   ```env
   GOOGLE_MAPS_API_KEY=your_api_key_here
   ```
3. **Install Dependencies**: Run `npm install` inside the `admin/` directory.

## Workflow: Adding New Items

1. **Add Photos**: Drop your new original photos into `photos/inbox/`.
2. **Start Server**: Run `make admin` from the root of the repository. This will start the local admin server (usually `http://localhost:3000`).
3. **Process Inbox**: Open the URL in your browser. Select a group of photos from the sidebar to begin processing.
4. **Verify Details**:
   - The map will center on the extracted coordinates.
   - The City and Country will be automatically determined based on boundaries.
   - Enter the **Year** from the facade.
   - Add any **Notes** or **External ID** (e.g., if listed in a heritage registry).
5. **Save**: Click **Save & Next** (or press Enter). The tool will move the photos to `photos/original/`, rename them to the `City/Year` convention, and append the record directly to the respective CSV file.
6. **Publish**: Once the inbox is empty, click the **Publish Batch** button. This will automatically upload the photos to your S3 bucket (using `make photos-upload`), stage all CSV changes in git, and create a GitHub pull request with all the changes ready for your review.
