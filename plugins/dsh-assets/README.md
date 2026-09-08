# dsh-assets

DSH plugin: AI-generated media assets for the workspace.

- One workspace-root `assets/` folder holds every generated image, video, and audio file.
- Agent tools `generate_image` / `generate_video` / `generate_audio` save into that folder; their descriptions tell agents the files exist and how to reference them (`assets/<file>`, relative).
- A better-sidebar tab ("Assets") previews everything (image thumbnails, video/audio players), organizes by kind, and hosts the provider settings: one provider (`openrouter` or `fal` for video) plus one model per kind, saved under `~/.dsh/assets/settings.json`.
- API keys come from the dsh credentials seam (`OPENROUTER_API_KEY`, `FAL_KEY`) — never sent to the browser.
- Served routes: `POST /assets/api/{status,list,config,models,generate,delete,open_folder}` and `GET /assets/file/<path>` (Range-capable, so video previews can seek).

Folder override via cordis config: `assetsFolder`.
