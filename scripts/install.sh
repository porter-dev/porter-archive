name=(curl -s https://api.github.com/repos/jgm/pandoc/releases/latest \
| grep "browser_download_url.*_Linux_x86_64\.tar\.gz" \
| cut -d ":" -f 2,3 \
| tr -d \"
)

curl -L https://github.com/porter-dev/porter/releases/latest/download/${name} --output ${name}
