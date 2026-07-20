#define MyAppName "TLS1 Trading"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Your Name or Company"
#define MyAppExeName "updater.exe"
#define MainAppExeName "TLS1 Trading.exe"

[Setup]
AppId={{YOUR-UNIQUE-GUID-HERE}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={localappdata}\{#MyAppName}
DisableProgramGroupPage=yes
OutputBaseFilename=TLS1 Trading Setup
Compression=lzma
SolidCompression=yes
SetupIconFile=media\logo.ico

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "App_Release\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
; LƯU Ý: Phải chép file TLS1 Trading.exe, updater.exe và .env.example vào thư mục App_Release trước khi build installer

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\{#MainAppExeName}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon; IconFilename: "{app}\{#MainAppExeName}"

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent
