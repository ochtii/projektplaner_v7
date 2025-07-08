@echo off
echo Erstelle Verzeichnisse...
mkdir static\js\core
mkdir static\js\ui
mkdir static\js\project
mkdir static\js\dashboard
mkdir static\js\settings
mkdir static\js\info
mkdir static\js\admin

echo Erstelle leere Dateien...
type nul > static\js\main.js
type nul > static\js\core\globals.js
type nul > static\js\core\api_db.js
type nul > static\js\core\guest_db.js
type nul > static\js\ui\modals.js
type nul > static\js\ui\global_ui.js
type nul > static\js\ui\project_tree_renderer.js
type nul > static\js\ui\comments_manager.js
type nul > static\js\ui\project_overview_renderer.js
type nul > static\js\project\project_manager_logic.js
type nul > static\js\dashboard\dashboard_logic.js
type nul > static\js\settings\settings_logic.js
type nul > static\js\info\info_logic.js
type nul > static\js\admin\admin_main.js
type nul > static\js\admin\user_management.js
type nul > static\js\admin\global_settings.js
type nul > static\js\admin\structure_check.js

echo JavaScript-Dateistruktur erfolgreich erstellt!
pause