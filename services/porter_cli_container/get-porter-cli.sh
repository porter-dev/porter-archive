#!/usr/bin/env bash

if [[ -z $VERSION ]]; then
  name=$(curl -s https://api.github.com/repos/porter-dev/porter/releases/latest | grep "browser_download_url.*/porter_.*_Linux_x86_64\.zip" | cut -d ":" -f 2,3 | tr -d \")
  name=$(basename "$name")
  curl -L https://github.com/porter-dev/porter/releases/latest/download/"$name" --output "$name"
else
  name=porter-$VERSION.zip
  curl -L https://github.com/porter-dev/porter/releases/download/"$VERSION"/porter_"$VERSION"_Linux_x86_64.zip --output "$name"
fi

unzip -a "$name"
rm "$name"
chmod +x ./porter
mv ./porter /usr/local/bin/
