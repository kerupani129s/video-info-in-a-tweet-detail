(() => {

	const parseJSON = json => {
		try {
			return JSON.parse(json);
		} catch {
			// メモ: JSON は null は値として許可されているが undefined は許可されていない
			return;
		}
	};

	const escapeHTML = html => html
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;').replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;').replaceAll('\'', '&#39;');

	// 
	const displayVideoInfo = (() => {

		const videoInfoElement = document.getElementById('video-info');

		const getTweetsInTweetDetail = tweetDetail => {
			try {
				return tweetDetail.data.threaded_conversation_with_injections_v2.instructions
					.filter(instruction => instruction.type === 'TimelineAddEntries')
					.map(instruction => instruction.entries)
					.flat()
					.filter(entry => entry.content.entryType === 'TimelineTimelineItem')
					.filter(entry => entry.content.itemContent.itemType === 'TimelineTweet')
					.map(entry => entry.content.itemContent.tweet_results.result.legacy);
			} catch {
				return [];
			}
		};

		const getVideosInTweet = tweet => {

			// メモ: 1 つでも media のパース時にエラーが発生すると全体がエラー扱いになる
			try {

				const videos = tweet['extended_entities']['media']
					.filter(media => {
						const type = media['type'];
						return type === 'video' || type === 'animated_gif';
					})
					.map(media => {

						const width = media['original_info']['width'];
						const height = media['original_info']['height'];
						const durationInMilliseconds = media['video_info']['duration_millis'] ?? 0;
						const durationInSeconds = durationInMilliseconds / 1000;

						// 
						const variantsMP4 = media['video_info']['variants']
							.filter(variant => variant['content_type'] === 'video/mp4');

						variantsMP4.sort((a, b) => b['bitrate'] - a['bitrate']);

						// メモ: アニメーション GIF の場合は bitrate が 0 になる
						const bitrate = variantsMP4[0]['bitrate'];
						const url = variantsMP4[0]['url'];

						// 中身が正当かどうかの確認
						if (
							! Number.isInteger(width) || width <= 0
							|| ! Number.isInteger(height) || height <= 0
							|| ! isFinite(durationInSeconds) || durationInSeconds < 0
							|| ! isFinite(bitrate) || bitrate < 0
							|| typeof url !== 'string' || ! url
						) {
							throw new Error('Invalid media data');
						}

						return {
							width,
							height,
							durationInSeconds,
							bitrate,
							url,
						};

					});

				return videos;

			} catch {
				return [];
			}

		};

		const getVieosInTweetDetail = tweetDetail => {

			const tweets = getTweetsInTweetDetail(tweetDetail);

			const videos = tweets
				.filter(tweet => 'media' in tweet['entities'])
				.map(tweet => getVideosInTweet(tweet))
				.flat();

			return videos;

		};

		const displayVideoInfo = tweetDetailJSON => {

			if ( ! tweetDetailJSON ) {
				videoInfoElement.innerHTML = '<p>No data</p>';
				return;
			}

			const tweetDetail = parseJSON(tweetDetailJSON);

			if ( typeof tweetDetail === 'undefined' ) {
				videoInfoElement.innerHTML = '<p class="error">Error: Invalid JSON</p>';
				return;
			}

			// 
			const videos = getVieosInTweetDetail(tweetDetail);

			if ( videos.length === 0 ) {
				videoInfoElement.innerHTML = '<p>No data</p>';
				return;
			}

			// 
			videoInfoElement.innerHTML = '';

			for (const video of videos) {

				const width = escapeHTML(String(video.width));
				const height = escapeHTML(String(video.height));
				const durationInSeconds = escapeHTML(String(video.durationInSeconds));
				const bitrate = escapeHTML(String(video.bitrate));
				const url = escapeHTML(video.url);

				const html = '<div>' +
					`Original Size: ${width}x${height}<br>` +
					(0 !== video.durationInSeconds ? `Duration: ${durationInSeconds}s<br>` : '') +
					(0 !== video.bitrate ? `Bitrate: ${bitrate}<br>` : '') +
					`<video src="${url}" controls><a href="${url}">MP4</a></video>` +
					'</div>';

				videoInfoElement.insertAdjacentHTML('beforeend', html);

			}

		};

		return displayVideoInfo;

	})();

	(() => {

		const tweetDetailElement = document.getElementById('tweet-detail');

		tweetDetailElement.addEventListener('input', event => {
			displayVideoInfo(event.currentTarget.value);
		});

		displayVideoInfo(tweetDetailElement.value);

	})();

})();
