#!/bin/bash
glib-compile-schemas schemas/

# Compile translations
for po in po/*.po; do
  lang=$(basename "$po" .po)
  mkdir -p "locale/${lang}/LC_MESSAGES"
  msgfmt "$po" -o "locale/${lang}/LC_MESSAGES/tablet-rect.mo"
done
