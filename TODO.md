Release cycle:
- Release
- Set next meeting day in >= 10 days
- >= 7 days to let the users use it  + development
- 3 days of interviews               + development
- Decision meeting
- Repeat

Deploy:

write email
git stuff
    git fetch
    git merge origin/master
npm install
npm test
restart node
    forever restartall
manual testing
send email

# Next release:

# For future releases:
- script that emails us when a video is missing: mark the playlist as not published.
- remove passport sessions from the test database after running the tests
- /api/user only returns playlistprogress when requested
- user service only returns (and downloads) playlistprogress when requested.
- Playlists infinite scrolling.
- Going to an URL (besides http://www.babelboo.com) without being logged asks for user and password, then redirects to the requested URL.
- A) Questions at the beginning, answers at the end.
    - Button 'Answer now' that pauses video and shows answers.
- B) Questions at the end.
    - Remove boring part at the end of videos.
- Change medal indices and values to ALWAYS GOLD = 0, SILVER = 1, BRONZE = 1
- Sign up for category updates.
- Video not playing automatically to allow you to read the questions.
- Star playlists (bookmarks).
- Bookmarklet to suggest YouTube videos.
- Remove tags from cards.
- Focus on easier videos or on harder videos
- Make playlists for specific people.
- Smarter related playlists.
- Visual difficulty levels.
- Keep level after finishing playlist.


# Silly things to do when bored
- Refactor CSS
    - Materialize more stuff
- Create tests
- In calls to the API that are a search with parameters (such as /api/ranking/period), the search parameters should be passed as part of the query, not the path. (e.g. /api/ranking?period=someperiod instead of /api/ranking/someperiod).


# Development/deployment
- Testing E2E
        - Protractor + Jasmine: All desktop browsers (needs to run in Windows for IE and MacOS for Safari)
        - saucelabs.com ($$): EVERYTHING (including mobile)
        - CasperJS + Mocha: Webkit + Gecko
    - try out frameworks
- Deploy
        - Strider (es la ostia)
        - Ansible, Puppet ($$)
    - try out frameworks


# Someday:

- Playlists
    - Playlist quality mark (playlists marked as good)

- Q&A
    * Questions after watching video (depends on user.abtesting.questionsatend == true)

- 9Gag (always something new + finished checking everything new)
    - "You got new stuff" reminder email
    * Old unvisited playlists appear at the bottom and are harder to reach

- Video-based playing
    - Manual search + related videos at the end

- Wiki (user-generated playlists, questions, difficulty adjustment, etc.)
    - self contained playlist creation tool
        - show video length
        - preview videos (clicking on the thumbnail, both in search and selected videos)
    - Interface to edit questions
    - Upvote/downvote difficulty
    - Comment on questions
    * Interface to edit playlists
    * Interface to add tags to playlist
    * Interface to create playlists (bonus: easily)

- Stack Overflow (milestones unlock privileges + rank visible to other users)
    - Learning goals? Can be implemented as badges
    - Reputation/badges per user
    - When do other users see them?
    - Unlocked privileges
    - Number of points to increase rank
    - Create playlists, modify other's playlists, modify other's questions, comment on questions
    - What gives points
