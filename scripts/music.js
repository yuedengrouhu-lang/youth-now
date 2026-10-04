/* ============================================================
   16. MUSIC
============================================================ */

function normalizeMusicItem(
    item
) {

    if (
        !item ||
        typeof item !==
            "object"
    ) {
        return null;
    }


    let artwork =
        safeExternalURL(
            item.artwork ||
            item.artworkUrl100 ||
            item.artworkUrl60 ||
            item.image
        );


    if (
        artwork
    ) {

        artwork =
            artwork.replace(
                /100x100/gi,
                "600x600"
            );
    }


    return {

        id:
            String(
                item.id ||
                item.trackId ||
                item.collectionId ||
                Math.random()
                    .toString(36)
            ),

        title:
            safeString(
                item.title ||
                item.trackName,
                "曲名不明"
            ),

        artist:
            safeString(
                item.artist ||
                item.artistName,
                "アーティスト不明"
            ),

        album:
            safeString(
                item.album ||
                item.collectionName,
                ""
            ),

        genre:
            safeString(
                item.genre ||
                item.primaryGenreName,
                "音楽"
            ),

        artwork,

        previewUrl:
            safeExternalURL(
                item.previewUrl ||
                item.preview
            ),

        trackViewUrl:
            safeExternalURL(
                item.trackViewUrl ||
                item.url
            ),

        releaseDate:
            safeString(
                item.releaseDate,
                ""
            ),

        durationMs:
            safeNumber(
                item.durationMs ||
                item.trackTimeMillis
            )
    };
}


function normalizeMusicData(
    data
) {

    let items = [];


    if (
        Array.isArray(
            data
        )
    ) {

        items =
            data;

    } else if (
        Array.isArray(
            data?.results
        )
    ) {

        items =
            data.results;

    } else if (
        Array.isArray(
            data?.items
        )
    ) {

        items =
            data.items;
    }


    return items
        .map(
            normalizeMusicItem
        )
        .filter(
            Boolean
        );
}


async function loadMusic(
    keyword =
        musicSearchWord
) {

    if (
        musicLoading
    ) {
        return;
    }


    musicLoading =
        true;


    musicSearchWord =
        safeString(
            keyword,
            "J-POP"
        );


    setText(
        DOM.musicMessage,
        "音楽を探しています…"
    );


    setDisabled(
        DOM.musicSearchButton,
        true
    );


    try {

        const url =
            `${APP_CONFIG.api.music}?q=${encodeURIComponent(
                musicSearchWord
            )}`;


        const data =
            await requestJSON(
                url
            );


        musicData =
            normalizeMusicData(
                data
            );


        lastMusicLoadTime =
            Date.now();


        renderMusic();


        setText(
            DOM.musicMessage,
            musicData.length
                ? `${musicData.length}件の音楽が見つかりました。`
                : "音楽が見つかりませんでした。"
        );


        announce(
            "音楽情報を更新しました"
        );

    } catch (error) {

        console.error(
            "[YOUTH NOW] 音楽取得失敗",
            error
        );


        setText(
            DOM.musicMessage,
            "音楽を取得できませんでした。"
        );

    } finally {

        musicLoading =
            false;


        setDisabled(
            DOM.musicSearchButton,
            false
        );
    }
}


function isMusicFavorite(
    item
) {

    if (
        !item
    ) {
        return false;
    }


    return musicFavorites.some(
        favorite =>
            String(
                favorite.id
            ) ===
            String(
                item.id
            )
    );
}


function toggleMusicFavorite(
    item
) {

    if (
        !item
    ) {
        return;
    }


    const index =
        musicFavorites.findIndex(
            favorite =>
                String(
                    favorite.id
                ) ===
                String(
                    item.id
                )
        );


    if (
        index >= 0
    ) {

        musicFavorites.splice(
            index,
            1
        );


        announce(
            "音楽のお気に入りを削除しました"
        );

    } else {

        musicFavorites.push(
            item
        );


        announce(
            "音楽をお気に入りに追加しました"
        );
    }


    saveMusicFavorites();

    renderMusic();
}


function getMusicPreviewURL(
    item
) {

    if (
        !item?.previewUrl
    ) {
        return "";
    }


    return `/api/music-preview?url=${encodeURIComponent(
        item.previewUrl
    )}`;
}


function createMusicCard(
    item,
    index
) {

    const favorite =
        isMusicFavorite(
            item
        );


    const artwork =
        item.artwork ||
        "";


    return `
        <article class="music-card">

            ${
                artwork
                    ? `
                        <img
                            class="music-artwork"
                            src="${escapeHTML(
                                artwork
                            )}"
                            alt=""
                            loading="lazy"
                        >
                      `
                    : `
                        <div class="music-artwork"></div>
                      `
            }


            <div class="music-info">

                <h3 class="music-title">
                    ${escapeHTML(
                        item.title
                    )}
                </h3>


                <div class="music-artist">
                    ${escapeHTML(
                        item.artist
                    )}
                </div>


                ${
                    item.album
                        ? `
                            <div class="music-album">
                                ${escapeHTML(
                                    item.album
                                )}
                            </div>
                          `
                        : ""
                }


                <span class="music-genre">
                    ${escapeHTML(
                        item.genre
                    )}
                </span>


                ${
                    item.previewUrl
                        ? `
                            <div class="music-controls">

                                <audio
                                    class="music-preview"
                                    controls
                                    preload="none"
                                    data-preview-url="${escapeHTML(
                                        item.previewUrl
                                    )}"
                                >
                                    お使いのブラウザは音声再生に対応していません。
                                </audio>

                            </div>
                          `
                        : `
                            <div class="music-album">
                                試聴できる音源がありません。
                            </div>
                          `
                }


                <div class="music-links">

                    ${
                        item.trackViewUrl
                            ? `
                                <a
                                    href="${escapeHTML(
                                        item.trackViewUrl
                                    )}"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="music-link"
                                >
                                    詳細 →
                                </a>
                              `
                            : ""
                    }


                    <button
                        type="button"
                        class="news-action music-favorite-button"
                        data-music-favorite-index="${index}"
                    >
                        ${
                            favorite
                                ? "⭐ お気に入り"
                                : "☆ お気に入り"
                        }
                    </button>

                </div>

            </div>

        </article>
    `;
}


function renderMusic() {

    if (
        !DOM.musicList
    ) {
        return;
    }


    if (
        !musicData.length
    ) {

        setHTML(
            DOM.musicList,
            `
            <div class="empty-card">
                音楽が見つかりませんでした。
            </div>
            `
        );

        return;
    }


    const items =
        musicData.slice(
            0,
            30
        );


    setHTML(
        DOM.musicList,
        items
            .map(
                (
                    item,
                    index
                ) =>
                    createMusicCard(
                        item,
                        index
                    )
            )
            .join(
                ""
            )
    );


    $all(
        "[data-music-favorite-index]"
    ).forEach(
        button => {

            addEvent(
                button,
                "click",
                event => {

                    event.preventDefault();

                    const index =
                        Number(
                            button.dataset
                                .musicFavoriteIndex
                        );


                    const item =
                        items[
                            index
                        ];


                    toggleMusicFavorite(
                        item
                    );
                }
            );
        }
    );


    $all(
        ".music-preview"
    ).forEach(
        audio => {

            const directURL =
                audio.dataset.previewUrl;


            const proxyURL =
                getMusicPreviewURL({
                    previewUrl:
                        directURL
                });


            if (
                proxyURL
            ) {

                audio.src =
                    proxyURL;


                let fallbackUsed =
                    false;


                addEvent(
                    audio,
                    "error",
                    () => {

                        if (
                            fallbackUsed
                        ) {
                            return;
                        }


                        fallbackUsed =
                            true;


                        if (
                            directURL
                        ) {

                            audio.src =
                                directURL;

                            audio.load();
                        }
                    }
                );
            }
        }
    );
}


function bindMusic() {

    addEvent(
        DOM.musicSearchButton,
        "click",
        event => {

            event.preventDefault();

            loadMusic(
                getValue(
                    DOM.musicSearchInput
                ).trim() ||
                "J-POP"
            );
        }
    );


    addEvent(
        DOM.musicSearchInput,
        "keydown",
        event => {

            if (
                event.key ===
                "Enter"
            ) {

                event.preventDefault();

                loadMusic(
                    getValue(
                        DOM.musicSearchInput
                    ).trim() ||
                    "J-POP"
                );
            }
        }
    );
}




