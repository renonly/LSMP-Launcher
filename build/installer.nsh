; Visual do instalador ESMP (tema roxo escuro)
; Os defines são protegidos: o electron-builder já define alguns (ex.: MUI_HEADERIMAGE_RIGHT)
!macro customHeader
  !ifdef MUI_BGCOLOR
    !undef MUI_BGCOLOR
  !endif
  !define MUI_BGCOLOR "0A0614"
  !ifdef MUI_TEXTCOLOR
    !undef MUI_TEXTCOLOR
  !endif
  !define MUI_TEXTCOLOR "F3EFFC"
  BrandingText "ESMP Launcher"
!macroend
