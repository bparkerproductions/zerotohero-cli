<template>
  <div class="youtube-view main pt-3 pb-5">
    <div class="container">
      <div class="row">
        <div class="col-sm-12">
          <SimpleSearch
            class="mb-5"
            :placeholder="$t('Search YouTube', { l2: $l2.name })"
            buttonText="Search"
            :action="
              url => {
                location.hash = `#/${$l1.code}/${
                  $l2.code
                }/youtube/search/${encodeURIComponent(url)}`
              }
            "
            ref="search"
          />
        </div>
      </div>
      <div class="row">
        <div class="col-sm-12">
          <h3 :key="title">
            <Annotate :showTranslate="true">
              <span>{{ title }}</span>
            </Annotate>
          </h3>
          <template v-if="!loading && hasSubtitles">
            <b-button v-if="!saved" @click="save"><i class="fas fa-plus mr-2"></i>Add to Library</b-button>
            <b-button v-else variant="success">
              <i class="fa fa-check mr-2"></i>Added
            </b-button>
          </template>
          <b-dropdown
            id="dropdown-1"
            v-if="saved"
            :text="saved.topic ? topics[saved.topic] : 'Topic'"
            :variant="saved.topic ? 'success' : undefined"
            class="ml-1"
          >
            <b-dropdown-item
              v-for="(title, slug) in topics"
              @click="changeTopic(slug)"
              >{{ title }}</b-dropdown-item
            >
          </b-dropdown>
          <template v-if="saved && !saved.lesson">
            <b-dropdown
              id="dropdown-1"
              :text="saved.level ? levels[saved.level] : 'Level'"
              :variant="saved.level ? 'success' : undefined"
              class="ml-1"
            >
              <b-dropdown-item
                v-for="(title, slug) in levels"
                @click="changeLevel(slug)"
                >{{ title }}</b-dropdown-item
              >
            </b-dropdown>
            <b-button variant="danger" @click="remove" class="ml-1"
              ><i class="fas fa-trash-alt"></i
            ></b-button>
          </template>
          <hr class="mt-3" />
          <YouTubeChannelCard v-if="channel" :channel="channel" class="mb-4 d-inline-block" />
        </div>
      </div>
    </div>
    <div class="container-fluid">
      <div class="row">
        <div class="youtube-video-column col-md-6 sticky">
          <div class="youtube-video-wrapper sticky pt-3 pb-3 bg-white" :key="'youtube-' + args">
            <YouTubeVideo ref="youtube" :youtube="args" />
          </div>
        </div>
        <div class="col-md-6" :key="'transcript-' + args">
          <div v-if="loading" class="text-center">
            <Loader :sticky="true" />
          </div>
          <div v-else-if="!loading && hasSubtitles">
            <SyncedTranscript
              ref="transcript"
              :onSeek="seekYouTube"
              :onPause="pauseYouTube"
              :lines="this.l2Lines"
              :parallellines="this.l1Lines"
              
            />
            <div class="play-pause-wrapper">
              <span class="play-pause shadow btn-secondary d-inline-block mb-2 text-center" @click="scrollToComments"><i class="fas fa-comment"></i></span><br/>
              <span class="play-pause shadow btn-primary d-inline-block text-center" @click="togglePaused"><i v-if="paused" class="fas fa-play"></i><i v-else class="fas fa-pause"></i></span>
            </div>
          </div>
          <div
            v-else-if="!loading && !hasSubtitles"
            class="jumbotron pt-4 pb-3 bg-light"
          >
            <h6>
              Sorry, this YouTube video does not have {{ $l2.name }} closed
              captions.
            </h6>
            <p>
              You can tell if a YouTube video has closed captions by clicking on
              the
              <b>CC</b> icon in the player bar, and click on the
              <i class="fas fa-cog"></i>next to it. If you can find the subtitle
              with the language
              <b>{{ $l2.name }}</b>
              then the video has {{ $l2.name }}
              subtitles.
            </p>
            <p>
              To look for videos with t{{ $l2.name }} subtitles, search with a
              {{ $l2.name }}
              keyword, and click
              <b>Filter</b>, then <b>CC</b>.
            </p>
          </div>
        </div>
      </div>
    </div>
    <div class="container-fluid">
      <div class="row">
        <div class="col-md-6 p-5">
          <h4 class="mt-5 mb-4">
            {{ $t('Related')}}
          </h4>
          <YouTubeSearchResults :term="channel ? channel.title : title" :start="0" />
        </div>
        <div class="col-md-6 p-5" id="comments">
          <h4 class="mt-5 mb-4">
            {{ $t('Comments') }}
          </h4>
          <div class="comments">
            <vue-disqus shortname="zero-to-hero" :identifier="`youtube-view-${args}`" :url="`https://www.zerotohero.ca/#/${$l1.code}/${$l2.code}/youtube/view/${args}`"></vue-disqus>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import YouTubeVideo from '@/components/YouTubeVideo'
import SyncedTranscript from '@/components/SyncedTranscript'
import YouTubeChannelCard from '@/components/YouTubeChannelCard'
import SimpleSearch from '@/components/SimpleSearch'
import YouTubeSearchResults from '@/components/YouTubeSearchResults'
import YouTube from '@/lib/youtube'
import Helper from '@/lib/helper'
import Config from '@/lib/config'

export default {
  components: {
    YouTubeSearchResults,
    SimpleSearch,
    YouTubeVideo,
    YouTubeChannelCard,
    SyncedTranscript
  },
  props: {
    args: {
      type: String
    },
    lesson: {
      default: false
    }
  },
  watch: {
    args() {
      this.getSaved()
      this.getVideoDetails()
      this.getTranscript()
      this.$refs.search.url = `https://www.youtube.com/watch?v=${this.args}`
    }
  },
  data() {
    return {
      location,
      l1Lines: [],
      l2Lines: [],
      title: undefined,
      channel: undefined,
      hasSubtitles: false,
      loading: true,
      l2Locale: undefined,
      saved: undefined,
      paused: true,
      levels: Helper.levels(this.$l2),
      topics: Helper.topics
    }
  },
  methods: {
    wordSaved(word) {
      let saved = false
      if (word) {
        saved = this.$store.getters.hasSavedWord({
          id: word.id,
          l2: this.$l2.code
        })
      }
      return saved
    },
    async allForms(word) {
      let wordForms =
        (await (await this.$dictionary).wordForms(word)) || []
      wordForms = wordForms.filter(form => form !== '')
      wordForms = [word.bare.toLowerCase()].concat(wordForms.map(form => form.form.replace(/'/g, '')))
      wordForms = Helper.unique(wordForms).filter(form => form && form !== '' && form !== '-')
      return wordForms
    },
    async saveWords() {
      let words = await (await this.$dictionary).lookupByLesson(this.saved.level, this.saved.lesson)
      for (let word of words) {
        if (word && !this.wordSaved(word)) {
          let wordForms = await this.allForms(word)
          this.$store.dispatch('addSavedWord', {
            word: word,
            wordForms: wordForms,
            l2: this.$l2.code
          })
        }
      }
    },
    seekYouTube(starttime) {
      this.$refs.youtube.seek(starttime)
    },
    pauseYouTube() {
      this.$refs.youtube.pause()
    },
    async getVideoDetails() {
      this.title = undefined
      this.channel = undefined
      let video = await YouTube.videoByApi(this.args)
      if (video) {
        this.title = video.title
        this.channel = video.channel
        document.title = `${this.title} | ${this.channel.title}`
      }
    },
    async getL2Transcript() {
      const promises = []
      let locales = [this.$l2.code]
      if (this.$l2.locales) {
        locales = locales.concat(this.$l2.locales)
      }
      for (let locale of locales) {
        promises.push(
          Helper.scrape2(
            `https://www.youtube.com/api/timedtext?v=${this.args}&lang=${locale}&fmt=srv3`
          ).then($html => {
            if ($html) {
              this.l2Locale = locale
              let lines = []
              for (let p of $html.find('p')) {
                let line = {
                  line: $(p).text(),
                  starttime: parseInt($(p).attr('t')) / 1000
                }
                lines.push(line)
              }
              this.l2Lines = lines.filter(line => line.line.trim() !== '')
            }
          })
        )
      }
      let values = await Promise.all(promises)
    },
    async save() {
      let response = await $.post(`${Config.wiki}items/youtube_videos`, {
        youtube_id: this.args,
        title: this.title,
        l2: this.$l2.id,
        subs_l2: JSON.stringify(this.l2Lines)
      })
      if (response) {
        this.saved = response.data
      }
    },
    async getL1Transcript() {
      await Helper.scrape(
        `https://www.youtube.com/api/timedtext?v=${this.args}&lang=${this.l2Locale}&fmt=srv3&tlang=${this.$l1.code}`,
        $html => {
          for (let p of $html.find('p')) {
            let line = {
              line: $(p).text(),
              starttime: parseInt($(p).attr('t')) / 1000
            }
            this.l1Lines.push(line)
          }
        }
      )
      this.hasSubtitles = true
    },
    async getTranscript() {
      this.l1Lines = []
      this.l2Lines = []
      this.hasSubtitles = false
      this.loading = true
      await this.getL2Transcript()
      if (this.l2Lines.length > 0) {
        await this.getL1Transcript()
      }
      this.loading = false
    },
    async getSaved() {
      this.saved = undefined
      let response = await $.getJSON(
        `${Config.wiki}items/youtube_videos?filter[youtube_id][eq]=${this.args}&filter[l2][eq]=${this.$l2.id}&fields=id,youtube_id,l2,title,level,topic,lesson`
      )
      if (response && response.data && response.data.length > 0) {
        this.saved = response.data[0]
        if (this.lesson) {
          this.saveWords()
        }
      }
    },
    async changeLevel(slug) {
      let response = await $.ajax({
        url: `${Config.wiki}items/youtube_videos/${this.saved.id}`,
        data: JSON.stringify({ level: slug }),
        type: 'PATCH',
        contentType: 'application/json',
        xhr: function() {
          return window.XMLHttpRequest == null ||
            new window.XMLHttpRequest().addEventListener == null
            ? new window.ActiveXObject('Microsoft.XMLHTTP')
            : $.ajaxSettings.xhr()
        }
      })
      if (response && response.data) {
        this.saved = response.data
      }
    },
    async changeTopic(slug) {
      let response = await $.ajax({
        url: `${Config.wiki}items/youtube_videos/${this.saved.id}`,
        data: JSON.stringify({ topic: slug }),
        type: 'PATCH',
        contentType: 'application/json',
        xhr: function() {
          return window.XMLHttpRequest == null ||
            new window.XMLHttpRequest().addEventListener == null
            ? new window.ActiveXObject('Microsoft.XMLHTTP')
            : $.ajaxSettings.xhr()
        }
      })
      if (response && response.data) {
        this.saved = response.data
      }
    },
    async remove() {
      let response = await $.ajax({
        url: `${Config.wiki}items/youtube_videos/${this.saved.id}`,
        type: 'DELETE',
        contentType: 'application/json',
        xhr: function() {
          return window.XMLHttpRequest == null ||
            new window.XMLHttpRequest().addEventListener == null
            ? new window.ActiveXObject('Microsoft.XMLHTTP')
            : $.ajaxSettings.xhr()
        }
      })
      if (response) {
        this.saved = undefined
      }
    },
    scrollToComments() {
      document.getElementById('comments').scrollIntoView()
    },
    togglePaused() {
      this.$refs.youtube.togglePaused()
    },
    bindKeys() {
      window.onkeydown = e => {
        if (e.target.tagName.toUpperCase() !== 'INPUT') {
          if (e.keyCode == 32) { // Spacebar
            this.togglePaused()
            return false
          }
          if (e.keyCode == 38) { // Up arrow
            this.$refs.transcript.previousLine()
            return false
          }
          if (e.keyCode == 40) { // Down arrow
            this.$refs.transcript.nextLine()
            return false
          }
        }
      }
    },
    unbindKeys() {
      window.onkeydown = null
    }
  },
  mounted() {
    this.getSaved()
    this.getVideoDetails()
    this.getTranscript()
    this.$refs.search.url = `https://www.youtube.com/watch?v=${this.args}`
    setInterval(() => {
      if (this.$refs.transcript) {
        this.$refs.transcript.currentTime = this.$refs.youtube
          ? this.$refs.youtube.currentTime()
          : 0
      }
      if (this.$refs.youtube) {
        this.paused = this.$refs.youtube.paused
      }
    }, 1000)
  },
  activated() {
    this.bindKeys()
  },
  deactivated() {
    this.unbindKeys()
  }
}
</script>
<style lang="scss">
  .play-pause-wrapper {
    position: sticky;
    bottom: 2.3rem;
    left: 100%;
    width: 3.2rem;
  }
  .play-pause {
    border-radius: 100%;
    width: 3.2rem;
    height: 3.2rem;
    line-height: 3rem;
    border: none;
    font-size: 1.3em;
    cursor: pointer;
  }
  .youtube-video-column.sticky {
    top: 2.5rem;
  }
  .youtube-video-wrapper.sticky {
    top: 2.5rem;
  }
</style>
