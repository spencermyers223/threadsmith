# Media Library Feature for xthread

## User Workflow Requirements
- Batch upload media for week's content
- Organize media by folders/tags
- Easy access during post creation
- Reuse media across multiple posts

## Proposed MVP Features
1. **Media Library Tab**
   - Grid view of uploaded media
   - Drag-and-drop upload
   - Basic folder/tag organization
   - Search and filter capabilities

2. **Media Picker in Post Editor**
   - Sidebar or modal with recent uploads
   - Quick preview and selection
   - One-click attach to post

3. **Organizational Metadata**
   - Folder fields
   - Tags (product, lifestyle, etc.)
   - Upload date
   - Quick star/favorite option

## Technical Considerations
- Use existing Supabase storage
- Add metadata fields to media uploads
- Create new API endpoints for media library management
- Ensure performant retrieval of media items

## User Experience Goals
- Zero-friction media management
- Reduce context switching
- Support batch content creation workflow