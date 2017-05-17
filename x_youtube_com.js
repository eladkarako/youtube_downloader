// ==UserScript==
// @name        YouTube downloader
//
// @include     http://youtube.com/*
// @include     http://*.youtube.com/*
// @include     https://youtube.com/*
// @include     https://*.youtube.com/*
// ==/UserScript==

(typeof mono === 'undefined') && (mono = {loadModule: function() {this.loadModuleStack.push(arguments);},loadModuleStack: []});

mono.loadModule('youtube', function(moduleName, initData) {
  "use strict";

  var language = initData.getLanguage;
  var preference = initData.getPreference;
  var moduleState = preference.moduleYoutube ? 1 : 0;
  var allowDownloadMode = mono.isChrome || mono.isFF || (mono.isGM && mono.isTM);
  var iframe = mono.isIframe();

  mono.onMessage(function(message, cb){
    if (message.action === 'getModuleInfo') {
      if (message.url !== location.href) return;
      return cb({state: moduleState, moduleName: moduleName});
    }
    if (message.action === 'changeState') {
      if (moduleName !== message.moduleName) {
        return;
      }
      return youtube.changeState(message.state);
    }
    if (!moduleState) {
      return;
    }
    if (message.action === 'updateLinks') {
      var vId = youtube.getIdFromLocation();
      if (vId) {
        getPlayerConfig(function(config) {
          if (config && config.args && config.args.video_id === vId) {
            var oldBtn = document.getElementById(youtube.buttonId);
            if (oldBtn !== null) {
              oldBtn.parentNode.removeChild(oldBtn);
            }

            ytUmmyBtn.rmBtn();

            youtube.responseCache = {};
            youtube.video_id = config.args.video_id;
            var container = document.getElementById('watch7-subscription-container');
            youtube.appendDownloadButton(container);
          }
        });
      }
    }
    if (message.action === 'downloadPlaylist') {
      youtube.downloadPlaylist();
    }
  });

  if (moduleState) {
    mono.asyncCall(function() {
      youtube.run();
    });
  }

  var youtube = {
    swfargs: null,
    video_id: '',

    buttonId: 'savefrom__yt_btn',

    responseCache: {},
    isMobile: false,

    lastWaitChange: null,

    mobileMenu: null,
    currentMenu: null,
    currentTutorial: null,

    run: function() {
      moduleState = 1;
      if (iframe) {
        var embedVideoId = location.href.match(/\/embed\/([\w\-]+)/i);
        embedVideoId = embedVideoId && embedVideoId[1];

        if(!embedVideoId) {
          iframe = false;
        }
      }

      if (location.host.indexOf('m.') === 0) {
        youtube.isMobile = true;

        if (SaveFrom_Utils.mutationWatcher.isAvailable()) {
          youtube.mobileMutationMode.enable();
          return;
        }

        mono.onUrlChange(function(url) {
          youtube.hideMobileMenu();
          var vid = youtube.getIdFromLocation(url);
          if (!vid) {
            youtube.waitBtnContainer.stop();
            return;
          }
          youtube.waitBtnContainer.start(function() {
            return youtube.getMobileContainer();
          }, function(container) {
            youtube.appendMobileButton('', container);
          });
        }, 1);
        return;
      }

      if(iframe) {
        youtube.video_id = embedVideoId;

        youtube.appendFrameButton();
        return;
      }

      if (SaveFrom_Utils.mutationWatcher.isAvailable()) {
        youtube.videoFeed.injectStyle();
        youtube.mutationMode.enable();
        return;
      }

      mono.onUrlChange(function(url) {
        youtube.lastWaitChange && youtube.lastWaitChange.abort();

        youtube.videoFeed.onUrlUpdate(url);

        youtube.hideCurrentMenu();

        var vId = youtube.getIdFromLocation(url);
        if (!vId) {
          return;
        }

        youtube.lastWaitChange = youtube.waitChange(function onCheck(cb) {
          getPlayerConfig(function(config) {
            if (config && config.args && config.args.video_id === vId) {
              return cb(config);
            }
            cb();
          });
        }, function onDune(config) {
          if (!config) return;

          youtube.video_id = config.args.video_id;

          youtube.lastWaitChange = youtube.waitChange(function onCheck(cb) {
            cb(document.getElementById('watch7-subscription-container'));
          },function onDune(container) {
            if (!container) {
              return;
            }

            var btnVid = youtube.video_id;
            youtube.appendDownloadButton(container, 1);

            youtube.lastWaitChange = youtube.waitChange(function onCheck(cb) {
              if (btnVid !== youtube.video_id) {
                return cb();
              }
              if (document.body.contains(container)) {
                return cb();
              }
              cb(document.getElementById('watch7-subscription-container'));
            }, function onDune(container) {
              if (!container) {
                return;
              }
              youtube.appendDownloadButton(container, 1);
            }, {
              count: 1,
              timer: 8*1000,
              repeat: 1
            });
          });
        });
      }, 1);
    },

    changeState: function(state) {
      moduleState = state;
      if (iframe || youtube.isMobile) {
        return;
      }
      youtube.lastWaitChange && youtube.lastWaitChange.abort();
      mono.clearUrlChange();

      youtube.tutorial.hide();

      youtube.hideCurrentMenu();

      youtube.videoFeed.disable();
      youtube.videoFeed.rmBtn();

      youtube.mutationMode.stop();

      var btn = document.getElementById(youtube.buttonId);
      if (btn) {
        btn.parentNode.removeChild(btn);
      }

      ytUmmyBtn.rmBtn();

      if (state) {
        youtube.run();
      }
    },

    hideCurrentMenu: function() {
      if (youtube.currentMenu) {
        youtube.currentMenu.hide();
        youtube.currentMenu = null;
      }
    },

    hideMobileMenu: function() {
      if (youtube.mobileMenu) {
        youtube.mobileMenu.hide();
        youtube.mobileMenu = null;
      }
    },

    mutationMode: {
      observer: null,
      stop: function() {
        if (youtube.mutationMode.observer) {
          youtube.mutationMode.observer.stop();
        }

        ['sfSkip'].forEach(function(attr) {
          var dataAttr = mono.dataAttr2Selector(attr);
          var dataAttrList = document.querySelectorAll('['+dataAttr+']');
          for (var i = 0, item; item = dataAttrList[i]; i++) {
            item.removeAttribute(dataAttr);
          }
        });
      },
      wrapVideoFeedOnImgHover: function(context) {
        mono.off(this, 'mouseover', context.event);

        if (!moduleState) {
          return;
        }

        if (this.dataset.sfBtn > 0) {
          return;
        }
        this.dataset.sfBtn = '1';

        this.appendChild(youtube.videoFeed.getBtnNode(context.id));
      },
      enable: function() {
        var _this = this;

        if (_this.observer) {
          return _this.observer.start();
        }

        _this.observer = SaveFrom_Utils.mutationWatcher.run({
          callback: function(summaryList) {
            var summary, node, n, i;

            summary = summaryList[0];
            for (n = 0; node = summary.added[n]; n++) {
              if (node.dataset.sfSkip > 0) {
                continue;
              }
              node.dataset.sfSkip = '1';

              youtube.appendDownloadButton(node);
            }

            if (youtube.videoFeed.testUrl(location.href)) {
              for (i = 1; i < 3; i++) {
                summary = summaryList[i];
                for (n = 0; node = summary.added[n]; n++) {
                  if (node.dataset.sfSkip > 0) {
                    continue;
                  }
                  node.dataset.sfSkip = '1';

                  var id = node.dataset.videoIds;
                  if (!id) {
                    return;
                  }

                  var el = node.parentNode;
                  var context = {};
                  context.id = id;
                  context.event = _this.wrapVideoFeedOnImgHover.bind(el, context);

                  mono.on(el, 'mouseover', context.event);
                }
              }
            }

            summary = summaryList[3];
            for (n = 0; node = summary.removed[n]; n++) {
              mono.onRemoveListener(node);
            }
          },
          queries: [
            {css: '#watch7-subscription-container', is: 'added'},
            {css: 'button.addto-watch-later-button-sign-in', is: 'added'},
            {css: 'button.addto-watch-later-button', is: 'added'},
            {css: '.' + mono.onRemoveClassName, is: 'removed'}
          ]
        });
      }
    },

    mobileMutationMode: {
      observer: null,
      stop: function() {
        if (youtube.mutationMode.observer) {
          youtube.mutationMode.observer.stop();
        }

        ['sfSkip'].forEach(function(attr) {
          var dataAttr = mono.dataAttr2Selector(attr);
          var dataAttrList = document.querySelectorAll('['+dataAttr+']');
          for (var i = 0, item; item = dataAttrList[i]; i++) {
            item.removeAttribute(dataAttr);
          }
        });
      },
      enable: function() {
        var _this = this;

        if (_this.observer) {
          return _this.observer.start();
        }

        _this.observer = SaveFrom_Utils.mutationWatcher.run({
          callback: function(summaryList) {
            var summary, node, n, i;

            summary = summaryList[0];
            for (n = 0; node = summary.added[n]; n++) {
              if (node.id.indexOf('koya_elem_') !== 0) {
                continue;
              }

              var ii = 0;
              while (ii < 4 && node) {
                node = node.parentNode;
                ii++;
              }

              if (!node || ii !== 4) {
                continue;
              }


              if (node.dataset.sfSkip > 0) {
                continue;
              }
              node.dataset.sfSkip = '1';

              youtube.appendMobileButton('', node);
            }

            summary = summaryList[1];
            for (n = 0; node = summary.removed[n]; n++) {
              mono.onRemoveListener(node);
            }
          },
          queries: [
            {css: 'div > div > div > a[onclick][href="#"] > span[id]', is: 'added'},
            {css: '.' + mono.onRemoveClassName, is: 'removed'}
          ]
        });
      }
    },

    _onSelectBtnClick: function(wrapBtnObj, e) {
      if (e.button > 0) {
        return;
      }

      e.stopPropagation();
      e.preventDefault();

      if (youtube.currentMenu && youtube.currentMenu.isShow) {
        youtube.hideCurrentMenu();
        return;
      }

      var btnObj = wrapBtnObj.btnObj;

      var videoId = btnObj.videoId;

      var menu = youtube.currentMenu = SaveFrom_Utils.popupMenu.quickInsert(btnObj.node, language.download + ' ...', 'sf-popupMenu', {
        onShow: function() {
          mono.onRemoveEvent(btnObj.node, youtube.hideCurrentMenu);
        },
        onHide: function() {
          mono.offRemoveEvent(btnObj.node, youtube.hideCurrentMenu);
        },
        onItemClick: function() {
          "use strict";
          var itag = this.link.itag;
          mono.storage.set({ytLastITag: itag}, function() {
            youtube.quickBtn.setValue(btnObj);
          });

          youtube.onMenuItemClick(this.link, {isPageItem: 1, videoId: videoId});
        }
      });

      var abort = function() {
        menu.update(language.noLinksFound);
      };

      if (!videoId) {
        return abort();
      }

      var onResponse = function(response) {
        if (response.links) {
          var menuLinks = SaveFrom_Utils.popupMenu.prepareLinks.youtube(response.links, response.title, response.subtitles);
          menu.update(menuLinks);
          return;
        }

        abort();
      };

      var response = youtube.responseCache[videoId];
      if(response) {
        return onResponse(response);
      }

      mono.sendMessage({
        action: 'getYoutubeLinks',
        extVideoId: videoId,
        url: location.href,
        checkSubtitles: true
      }, function(response) {
        if (response.links) {
          youtube.responseCache[videoId] = response;
        }

        onResponse(response);
      });

      if (btnObj.isFirstMenuShow && [1].indexOf(preference.cohortIndex) !== -1) {
        btnObj.isFirstMenuShow = false;
        mono.sendMessage({action: 'trackCohort', category: 'youtube', event: 'click', label: 'video-single'});
      }
    },

    appendDownloadButton: function(parent, skipIfExists) {
      var currentBtn = parent.querySelector('#' + youtube.buttonId);
      if (currentBtn) {
        if (skipIfExists) {
          return;
        }
        currentBtn.parentNode && currentBtn.parentNode.removeChild(currentBtn);
        currentBtn = null;
      }


      var _this = this;

      var wrapBtnObj = {};
      var btnObj = _this.getButtonUnderVideo(youtube._onSelectBtnClick.bind(null, wrapBtnObj));
      wrapBtnObj.btnObj = btnObj;
      btnObj.isFirstMenuShow = true;

      btnObj.setLoadingState();

      parent.appendChild(btnObj.node);

      youtube.tutorial.show({
        target: btnObj.node,
        trackId: 'Yt'
      });

      getPlayerConfig(function(config) {
        var videoId = null;

        if (config && config.args && config.args.video_id) {
          videoId = config.args.video_id;
        }

        if (!videoId) {
          return;
        }

        btnObj.node.dataset.sfVideoId = videoId;

        btnObj.ytConfig = config;
        btnObj.videoId = videoId;
        btnObj.isPage = 1;

        var ummyBtn = ytUmmyBtn(language, preference, videoId);

        if (ummyBtn) {
          btnObj.onGetLinks = function (menuLinks) {
            var links = menuLinks.slice(0);
            links = SaveFrom_Utils.popupMenu.sortMenuItems(links, {
              typeList: ['video', '3d', 'mute', 'mute60'],
              groupCompare: true
            });
            if (links.length === 0) {
              return;
            }

            var best = links[0];
            var quality = best.prop && best.prop.quality;

            if (['8K', '4K', '1440', '1080'].indexOf(quality) === -1) {
              return;
            }

            mono.trigger(ummyBtn, 'changeValue', {
              detail: JSON.stringify(best.prop && best.prop.quality)
            });
          };

          parent.appendChild(ummyBtn);
        }

        _this.quickBtn.setValue(btnObj);
      });
    },

    waitChange: function(onCheck, cb, options) {
      "use strict";
      var abort;
      options = options || {
          repeat: 0
        };

      var n = options.count || 12;

      var onCb = function(data) {
        cb.apply(null, arguments);

        if (options.repeat > 0) {
          options.repeat--;
          n = options.count || 12;
          wait();
        }
      };

      var checkFunc = function(data) {
        if (abort) return;

        if (data) {
          return onCb.apply(null, arguments);
        }

        wait();
      };

      var wait = function() {
        n--;
        setTimeout(function() {
          if (abort) return;

          if (n < 0) {
            return onCb();
          }

          onCheck(checkFunc);
        }, options.timer || 500);
      };

      if (!options.skipFirst) {
        onCheck(checkFunc);
      } else {
        wait();
      }

      return {
        abort: function() {
          abort = true;
        }
      }
    },

    waitBtnContainer: {
      count: undefined,
      timer: undefined,
      check: function(getContainer, onReady) {
        var container = getContainer();
        if (container !== null && container.dataset.sfSkip === undefined) {
          if (container.dataset.sfFound !== undefined) {
            container.dataset.sfSkip = 1;
          } else {
            if (container.dataset.sfCondidate === undefined) {
              container.dataset.sfCondidate = 1;
            } else {
              container.dataset.sfFound = 1;
              onReady(container);
              return 1;
            }
          }
        }

        return undefined;
      },
      start: function(getContainer, onReady) {
        var _this = youtube.waitBtnContainer;

        _this.stop();

        if (_this.check(getContainer, onReady) !== undefined) {
          return;
        }

        _this.timer = setInterval(function() {
          _this.count--;
          if (_this.check(getContainer, onReady) !== undefined || _this.count <= 0) {
            clearInterval(_this.timer);
          }
        }, 250);
      },
      stop: function() {
        var _this = youtube.waitBtnContainer;

        clearInterval(_this.timer);
        _this.count = 20;
      }
    },


    getIdFromLocation: function(url) {
      if(!url) {
        url = document.location.href;
      }

      var videoId = url.match(/\/watch\?(?:.+&)?v=([\w\-]+)/i);
      videoId = videoId && videoId[1];
      if(videoId) {
        return videoId;
      }

      return null;
    },

    getMobileContainer: function() {
      var elList = document.querySelectorAll('a[onclick][href="#"] span[id]');
      var elCount = 0;
      var fEl = undefined;
      for (var i = 0, el; el=elList[i];i++) {
        if (!el.id || el.id.substr(0, 10) !== 'koya_elem_') {
          continue;
        }
        elCount++;
        fEl = el;
      }
      if (elCount < 3) {
        return null;
      }
      var parent = fEl.parentNode.parentNode.parentNode;
      if (parent === null) {
        return null;
      }
      return parent.parentNode;
    },

    appendMobileButton: function(vid, container) {
      var firstChild = container.firstElementChild;
      firstChild = firstChild && firstChild.firstElementChild;
      if (!firstChild || firstChild.tagName !== 'H1') {
        return;
      }

      var button = mono.create('div', {
        data: {
          id: vid
        },
        style: {
          display: 'inline-block',
          height: '28px',
          width: '18px',
          marginRight: '20px',
          background: 'url('+SaveFrom_Utils.svg.getSrc('download', '#ADADAD')+') center no-repeat',
          cssFloat: 'right'
        },
        on: ['click', function() {
          var vid = this.dataset.id || youtube.getIdFromLocation();

          youtube.hideMobileMenu();

          var lightBox = youtube.mobileMenu = SaveFrom_Utils.mobileLightBox.show(language.download + ' ...');

          var onResponse = function(response) {
            var menuLinks = null;
            if (response && response.links) {
              menuLinks = SaveFrom_Utils.popupMenu.prepareLinks.youtube(response.links, response.title || youtube.getTitleModify());
            }
            lightBox.update(menuLinks);
          };

          var fromCache = youtube.responseCache[vid];
          if (fromCache) {
            return onResponse(fromCache);
          }

          mono.sendMessage({
            action: 'getYoutubeLinks',
            extVideoId: vid,
            url: location.href
          }, function(response){
            if (response.links) {
              youtube.responseCache[vid] = response;
            }
            onResponse(response);
          });
        }]
      });

      mono.onRemoveEvent(button, youtube.hideMobileMenu);

      container.appendChild(button);
    },

    getButtonUnderVideo: function(onSelectBtnClick) {
      var selectBtnIcon = null;
      var quickBtn = null;
      var selectBtn = null;
      var node = mono.create('div', {
        id: youtube.buttonId,
        style: {
          display: 'inline-block',
          marginLeft: '10px',
          verticalAlign: 'middle'
        },
        append: [
          quickBtn = mono.create('a', {
            class: 'sf-quick-dl-btn',
            style: {
              display: 'inline-block',
              fontSize: 'inherit',
              height: '22px',
              border: '1px solid #00B75A',
              borderRadius: '3px',
              borderTopRightRadius: 0,
              borderBottomRightRadius: 0,
              paddingRight: '12px',
              paddingLeft: '28px',
              cursor: 'pointer',
              verticalAlign: 'middle',
              position: 'relative',
              lineHeight: '22px',
              textDecoration: 'none',
              zIndex: 1,
              color: '#fff'
            },
            href: '#',
            append: [
              mono.create('i', {
                style: {
                  position: 'absolute',
                  display: 'inline-block',
                  left: '6px',
                  top: '3px',
                  backgroundImage: 'url('+SaveFrom_Utils.svg.getSrc('download', '#ffffff')+')',
                  backgroundSize: '12px',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                  width: '16px',
                  height: '16px'
                }
              }),
              language.download
            ]
          }),
          mono.create('style', {
            text: mono.styleObjToText({
              'button::-moz-focus-inner': {
                padding: 0,
                margin: 0
              },
              '.sf-quick-dl-btn': {
                backgroundColor: '#00B75A'
              },
              '.sf-quick-dl-btn:hover': {
                backgroundColor: 'rgb(0, 163, 80)'
              },
              '.sf-quick-dl-btn:active': {
                backgroundColor: 'rgb(0, 151, 74)'
              }
            }, '#' + youtube.buttonId)
          }),
          selectBtn = mono.create('button', {
            style: {
              position: 'relative',
              display: 'inline-block',
              marginLeft: '-2px',
              fontSize: 'inherit',
              height: '24px',
              paddingRight: '21px',
              backgroundColor: '#F8F8F8',
              border: '1px solid #CCCCCC',
              borderRadius: '3px',
              borderTopLeftRadius: '0',
              borderBottomLeftRadius: '0',
              cursor: 'pointer',
              color: '#9B9B9B',
              zIndex: 0,
              verticalAlign: 'middle'
            },
            on: ['mousedown', onSelectBtnClick],
            append: [
              selectBtnIcon = mono.create('i', {
                style: {
                  position: 'absolute',
                  display: 'inline-block',
                  top: '9px',
                  right: '6px',
                  border: '5px solid #868282',
                  borderBottomColor: 'transparent',
                  borderLeftColor: 'transparent',
                  borderRightColor: 'transparent'
                }
              })
            ]
          })
        ]
      });

      node.classList.add(mono.onRemoveClassName);

      var setQuality = function(text) {
        var node = typeof text === 'object' ? text : document.createTextNode(text);
        var first = selectBtn.firstChild;
        if (first === selectBtnIcon) {
          selectBtn.insertBefore(node, first);
        } else {
          selectBtn.replaceChild(node, first);
        }
      };

      return {
        node: node,
        selectBtn: selectBtn,
        quickBtn: quickBtn,
        setQuality: setQuality,
        setLoadingState: function() {
          setQuality(mono.create('img', {
            src: SaveFrom_Utils.svg.getSrc('info', '#333333'),
            style: {
              width: '14px',
              height: '14px',
              marginLeft: '6px',
              verticalAlign: 'middle',
              top: '-1px',
              position: 'relative'
            }
          }));
        }
      };
    },

    lastFrameObserver: null,
    observeFrameVideoChange: function(btnObj) {
      "use strict";
      var _this = this;
      if (this.lastFrameObserver) {
        this.lastFrameObserver.disconnect();
      }

      var target  = document.querySelector('.ytp-title-link');
      if (!target) {
        return;
      }

      var onChange = function() {
        var vid = youtube.getIdFromLocation(target.href);
        if (!vid) {
          return;
        }

        if (vid !== youtube.video_id) {
          youtube.video_id = vid;

          if (youtube.frameQualityDetected) {
            btnObj.link = null;
            btnObj.setLoadingState();

            _this.quickBtn.setValue(btnObj);
          }
        }
      };
      onChange();

      if (!SaveFrom_Utils.mutationWatcher.isAvailable()) {
        return;
      }

      var mObserver = SaveFrom_Utils.mutationWatcher.getMutationObserver();
      var observer = this.lastFrameObserver = new mObserver(function(mutations) {
        mutations.some(function(mutation) {
          if (mutation.type !== 'attributes') {
            return;
          }
          if (mutation.attributeName !== 'href') {
            return;
          }

          onChange();
          return true;
        });
      });
      var config = { attributes: true, childList: false, characterData: false };
      observer.observe(target, config);
    },

    appendFrameButton: function() {
      "use strict";
      if (document.body.clientWidth < 220 || document.body.clientHeight < 150) {
        return;
      }

      var _this = youtube;

      var firstMenuShow = true;

      var btnObj = SaveFrom_Utils.frameMenu.getBtn({
        btnId: 'sfYtFrameBtn',
        containerStyle: {
          top: '40px',
          right: '20px'
        },
        on: [
          ['mousedown', function(e) {
            e.stopPropagation();
            if (e.button !== 2) {
              return;
            }

            if (_this.onFrameMouseEnterBind && _this.onFrameMouseLeaveBind) {
              mono.off(document, 'mouseenter', _this.onFrameMouseEnterBind);
              mono.off(document, 'mouseleave', _this.onFrameMouseLeaveBind);
              _this.onFrameMouseEnterBind = null;
              _this.onFrameMouseLeaveBind = null;
            }
            if (_this.lastFrameObserver) {
              _this.lastFrameObserver.disconnect();
            }
            _this.hideCurrentMenu();
            if (btnObj.node.parentNode) {
              btnObj.node.parentNode.removeChild(btnObj.node);
            }
          }]
        ],
        onSelectBtn: ['mousedown', function(e) {
          if (e.button > 0) {
            return;
          }

          e.stopPropagation();
          e.preventDefault();

          var vid = _this.video_id;

          if (_this.currentMenu) {
            youtube.hideCurrentMenu();
            return;
          }

          btnObj.node.classList.add('hover');
          var menu = _this.currentMenu = SaveFrom_Utils.frameMenu.getMenu(this.parentNode, language.download + ' ...', 'sf-popupMenu', {
            onShow: function() {
              if (!firstMenuShow) {
                return;
              }
              firstMenuShow = false;

              if ([1].indexOf(preference.cohortIndex) !== -1) {
                mono.sendMessage({action: 'trackCohort', category: 'youtube', event: 'click', label: 'video-iframe'});
              }
            },
            onHide: function() {
              _this.currentMenu = null;
              btnObj.node.classList.remove('hover');
            },
            onItemClick: function() {
              var itag = this.link.itag;
              mono.storage.set({ytLastITag: itag}, function() {
                _this.quickBtn.setValue(btnObj);
              });

              youtube.onMenuItemClick(this.link, {isFrameItem: 1, videoId: vid});
            }
          });
          menu.el.classList.add('sf-show');

          var onResponse = function(response) {
            var menuLinks = SaveFrom_Utils.popupMenu.prepareLinks.youtube(response.links, response.title, response.subtitles, {
              ummyVid: 136
            });
            menu.update(menuLinks);
          };

          var response = _this.responseCache[vid];
          if (response) {
            return onResponse(response);
          }

          mono.sendMessage({
            action: 'getYoutubeLinks',
            extVideoId: vid,
            url: location.href,
            checkSubtitles: true
          }, function(response) {
            if (response.links) {
              _this.responseCache[vid] = response;
              return onResponse(response);
            }

            menu.update(language.noLinksFound);
          });
        }]
      });

      btnObj.setLoadingState();

      document.body.appendChild(btnObj.node);

      var onBtnMouseEnter = function() {
        mono.off(btnObj.node, 'mouseenter', onBtnMouseEnter);

        if (this.frameQualityDetected) {
          return;
        }
        this.frameQualityDetected = true;

        this.quickBtn.setValue(btnObj);
      }.bind(this);

      mono.on(btnObj.node, 'mouseenter', onBtnMouseEnter);

      if (this.onFrameMouseEnterBind && this.onFrameMouseLeaveBind) {
        mono.off(document, 'mouseenter', this.onFrameMouseEnterBind);
        mono.off(document, 'mouseleave', this.onFrameMouseLeaveBind);
      }

      this.onFrameMouseEnterBind = this.onFrameMouseEnter.bind(this, btnObj);
      this.onFrameMouseLeaveBind = this.onFrameMouseLeave.bind(this, btnObj);

      mono.on(document, 'mouseenter', this.onFrameMouseEnterBind);
      mono.on(document, 'mouseleave', this.onFrameMouseLeaveBind);

      this.observeFrameVideoChange(btnObj);
    },

    frameQualityDetected: false,
    frameQualityTimer: null,

    onFrameMouseEnterBind: null,
    onFrameMouseLeaveBind: null,

    onFrameMouseEnter: function(btnObj) {
      "use strict";
      btnObj.node.classList.add('sf-show');

      if (youtube.currentMenu) {
        youtube.currentMenu.el.classList.add('sf-show');
      }


      if (!this.frameQualityDetected) {
        clearTimeout(this.frameQualityTimer);
        this.frameQualityTimer = setTimeout(function() {
          if (this.frameQualityDetected) {
            return;
          }
          this.frameQualityDetected = true;


          this.quickBtn.setValue(btnObj);
        }.bind(this), 500);
      }
    },

    onFrameMouseLeave: function(btnObj) {
      "use strict";
      if (!this.frameQualityDetected) {
        clearTimeout(this.frameQualityTimer);
      }

      btnObj.node.classList.remove('sf-show');

      if (youtube.currentMenu) {
        youtube.currentMenu.el.classList.remove('sf-show');
      }
    },

    getTitle: function()
    {
      var t = document.getElementById('watch-headline-title');
      if(t)
        return t.textContent;

      var meta = document.getElementsByTagName('meta');
      for(var i = 0; i < meta.length; i++)
      {
        var name = meta[i].getAttribute('name');
        if(name && name.toLowerCase() == 'title')
          return meta[i].getAttribute('content');
      }

      if(iframe || youtube.isMobile)
        return document.title.replace(/ - YouTube$/, '');

      return '';
    },

    getTitleModify: function() {
      "use strict";
      var title = youtube.getTitle();
      if(title) {
        title = modifyTitle(title);
      }

      return title;
    },

    onMenuItemClick: function(link, details) {
      "use strict";
      details = details || {};

      var data = {
        itag: link.itag || '',
        quality: link.quality || '',
        format: link.format || '???',
        '3d': link['3d'] ? '3D' : '',
        sFps: link.sFps ? 'fps' + (link.fps || 60) : '',
        noAudio: link.noAudio ? 'no audio' : '',
        uIsAudio: link.uIsAudio ? 'audio' : ''
      };

      if (!link.format) {
        mono.sendMessage({action: 'trackEvent', category: 'youtube', event: 'new_format', label: link.itag+' '+details.videoId});
      }

      var label = [
        data.format
      ];

      if (data.quality === 'ummy') {
        if (data.uIsAudio) {
          label.push(data.uIsAudio);
        }

        if (details.isFrame || details.isFrameItem) {
          label.push('if');
        }
      } else {
        if (data.quality) {
          label.push(data.quality.replace(' ' + mono.global.language.kbps, ''));
        }
        if (data.sFps) {
          label.push(data.sFps);
        }
        if (data['3d']) {
          label.push(data['3d']);
        }
        if (data.noAudio) {
          label.push(data.noAudio);
        }
        label.push(data.itag);
      }

      label = label.join(' ');

      if (['18', '22'].indexOf(String(data.itag)) === -1) {
        mono.sendMessage({action: 'trackEvent', category: 'youtube', event: 'download', label: label});
      }
    },

    onDlBtnClick: function(e, link, details) {
      details = details || {};
      if (!link) {
        e.preventDefault();
        e.stopPropagation();
        mono.trigger(this.parentNode.lastChild, 'mousedown');
        return;
      }

      youtube.onMenuItemClick(link, details);

      if (link.quality !== 'ummy' && link.forceDownload) {
        SaveFrom_Utils.downloadOnClick(e, null, {
          useFrame: link.useIframe || false
        });
      }
    },

    quickBtn: {
      prepMenuLinks: function(links, title) {
        "use strict";
        var menuLinks = SaveFrom_Utils.popupMenu.prepareLinks.youtube(links, title);
        var ummyLinks = {};

        var linkList = [];
        for (var i = 0, item; item = menuLinks[i]; i++) {
          if (item.quality === 'ummy') {
            ummyLinks[item.itag] = item;
          }
          linkList.push({prop: item});
        }
        menuLinks = SaveFrom_Utils.popupMenu.sortMenuItems(linkList);

        return {menuLinks: menuLinks, ummyLinks: ummyLinks};
      },

      setValueInSelectBtn: function(details, text) {
        "use strict";
        if (typeof text !== 'object') {
          text = document.createTextNode(text);
        }
        var first = details.selectBtn.firstChild;
        if (first === details.selectBtn.lastChild) {
          details.selectBtn.insertBefore(text, first)
        } else {
          details.selectBtn.replaceChild(text, first);
        }
      },

      getBestItem: function(menuLinks) {
        var sList = [];
        for (var i = 0, item; item = menuLinks[i]; i++) {
          if (item.prop.noAudio || item.prop.noVideo) {
            continue;
          }
          if (item.prop.format === 'ummy') {
            continue;
          }
          if (!item.prop.isHidden) {
            sList.push(item.prop);
          }
        }

        if (!sList.length) {
          return;
        }

        return sList[0];
      },

      bindDlBtn: function(details) {
        "use strict";
        var quickBtn = details.quickBtn;
        if (details.quickBtnEvent) {
          quickBtn.removeEventListener('click', details.quickBtnEvent);
        }
        quickBtn.addEventListener('click', details.quickBtnEvent = function(e) {
          e.stopPropagation();

          if (details.link && youtube.currentMenu) {
            youtube.hideCurrentMenu();
          }

          var dlBtnDetails = {
            videoId: details.videoId || youtube.video_id
          };
          if (details.isPage) {
            dlBtnDetails.isPage = 1;
          } else {
            dlBtnDetails.isFrame = 1;
          }

          youtube.onDlBtnClick.call(this, e, details.link, dlBtnDetails);
        });
      },

      setBestValue: function(details, link) {
        "use strict";
        var quickBtn = details.quickBtn;

        details.link = link;

        var btnText = link.quality;
        if (!link.noVideo) {
          btnText = parseInt(btnText);
        }
        if (link['3d']) {
          btnText = '3D ' + btnText;
        }
        if (link.sFps) {
          btnText += ' ' + (link.fps || 60);
        }

        var textContainer = mono.create('span', {
          text: btnText,
          style: {
            marginLeft: '6px',
            verticalAlign: 'bottom'
          }
        });

        this.setValueInSelectBtn(details, textContainer);

        var title = [link.format, btnText];
        if (link.noAudio) {
          title.push(language.withoutAudio);
        }
        title = title.join(' ');

        quickBtn.title = title;
        quickBtn.href = link.href;

        if (link.title && link.format) {
          var ext = link.ext;
          if(!ext) {
            ext = link.format.toLowerCase();
          }
          quickBtn.setAttribute('download', mono.fileName.modify(link.title + '.' + ext) );
        }
      },

      setUmmyBadge: function(details, link) {
        "use strict";
        var quickBtn = details.quickBtn;

        details.link = link;

        mono.sendMessage({action: 'getUmmyIcon'}, function(dataImg) {
          var ummyIcon = mono.create('span', {
            style: {
              width: '16px',
              height: '16px',
              backgroundImage: 'url('+dataImg+')',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              marginLeft: '6px',
              display: 'inline-block',
              verticalAlign: 'top'
            }
          });
          this.setValueInSelectBtn(details, ummyIcon);
        }.bind(this));

        quickBtn.title = mono.capitalize(link.quality);
        quickBtn.href = link.href;

        quickBtn.removeAttribute('download');
      },

      onGetLinks: function(details, links, title) {
        "use strict";
        if (links) {
          var count = Object.keys(links).length;
          if (links.meta) {
            count--;
          }
        }
        if (!links || !count) {
          return this.setValueInSelectBtn(details, '');
        }

        mono.storage.get('ytLastITag', function(storage) {
          var ytLastITag = storage.ytLastITag;

          var menuLinks = this.prepMenuLinks(links, title || youtube.getTitleModify());

          details.onGetLinks && details.onGetLinks(menuLinks.menuLinks);

          if (ytLastITag === 'ummyAudio') {
            ytLastITag = 'ummy';
          }

          if (ytLastITag === 'ummy' && menuLinks.ummyLinks[ytLastITag]) {
            this.setUmmyBadge(details, menuLinks.ummyLinks[ytLastITag]);
          } else {
            var link = this.getBestItem(menuLinks.menuLinks);
            if (link) {
              this.setBestValue(details, link);
            } else {
              this.setValueInSelectBtn(details, '');
            }
          }
        }.bind(this));
      },
      setValue: function(details) {
        "use strict";
        this.bindDlBtn(details);

        var vid = details.videoId || youtube.video_id;
        if(!vid) {
          return this.onGetLinks(details);
        }

        var response = youtube.responseCache[vid];
        if(response) {
          this.onGetLinks(details, response.links, response.title);
          response = null;
          return;
        }

        var onResponse = function (response) {
          response = response || {};

          if (response.isQuick) {
            details.quickBtn.dataset.isQuick = '1';
          }

          return this.onGetLinks(details, response.links, response.title);
        }.bind(this);

        var request = {
          action: 'getYoutubeLinks',
          extVideoId: vid,
          url: location.href,
          noDash: true
        };

        if (details.ytConfig) {
          request.action = 'getYoutubeLinksFromConfig';
          request.config = details.ytConfig;
        }

        mono.sendMessage(request, onResponse);
      }
    },

    videoFeed: {
      style: null,
      imgIdPattern: /vi[^\/]*\/([^\/]+)/,
      rList: [
        /\/playlist\?/,
        /(user|channel|show)\/[^\/]+(\/feed|\/featured|\/videos|$)/i,
        /\/(feed)\/(trending|subscriptions|history)/i
      ],
      testUrl: function(url) {
        return this.rList.some(function(r) {
          return r.test(url);
        });
      },
      onUrlUpdate: function(url) {
        if (this.testUrl(url)) {
          this.enable();
        } else {
          this.disable();
        }
      },
      disable: function() {
        mono.off(document, 'mouseenter', this.onVideoImgHover, true);
        if (this.style) {
          this.style.parentNode && this.style.parentNode.removeChild(this.style);
        }
      },
      enable: function() {
        if (iframe) {
          return;
        }

        mono.off(document, 'mouseenter', this.onVideoImgHover, true);
        mono.on(document, 'mouseenter', this.onVideoImgHover, true);

        this.injectStyle();
      },
      injectStyle: function() {
        if (this.style) {
          !this.style.parentNode && document.body.appendChild(this.style);
          return;
        }

        this.style = mono.create('style', {
          class: 'sf-feed-style',
          text: "a > .sf-feed-btn," +
          "div > .sf-feed-btn," +
          "span > .sf-feed-btn {" +
          'display: none;' +
          'border: 1px solid #d3d3d3;' +
          'width: 20px;' +
          'height: 20px;' +
          'padding: 0;' +
          'position: absolute;' +
          'right: 26px;' +
          'bottom: 2px;' +
          'border-radius: 2px;' +
          'background: url(' + SaveFrom_Utils.svg.getSrc('download', '#777777') + ') center no-repeat #f8f8f8;' +
          'background-size: 12px;' +
          'cursor: pointer;' +
          "}" +
          "a > .sf-feed-btn:hover," +
          "div > .sf-feed-btn:hover," +
          "span > .sf-feed-btn:hover {" +
          'background: url(' + SaveFrom_Utils.svg.getSrc('download', '#00B75A') + ') center no-repeat #f8f8f8;' +
          'background-size: 12px;' +
          "}" +
          "a > .sf-feed-btn:active," +
          "div > .sf-feed-btn:active," +
          "span > .sf-feed-btn:active {" +
          "outline: 0;" +
          "box-shadow: inset 0 3px 5px rgba(0, 0, 0, 0.125);" +
          "}" +
          "a:hover > .sf-feed-btn," +
          "div:hover > .sf-feed-btn," +
          "span:hover > .sf-feed-btn {display: block;}"
        });

        document.body.appendChild(this.style);
      },
      rmBtn: function() {
        var nodeList = document.querySelectorAll('.sf-feed-btn');
        for (var i = 0, item; item = nodeList[i]; i++) {
          item.parentNode.removeChild(item);
        }

        ['sfBtn', 'sfSkip'].forEach(function(attr) {
          var dataAttr = mono.dataAttr2Selector(attr);
          nodeList = document.querySelectorAll('['+dataAttr+']');
          for (i = 0, item; item = nodeList[i]; i++) {
            item.removeAttribute(dataAttr);
          }
        });
      },

      onVideoImgHover: function(e) {
        if (e.target.tagName !== 'IMG') {
          return;
        }

        youtube.videoFeed.onImgHover.call(e.target, e);
      },

      getBtnNode: function(vid) {
        return mono.create('i', {
          class: "sf-feed-btn",
          append: [
            !mono.isOpera ? undefined : mono.create('img', {
              src: SaveFrom_Utils.svg.getSrc('download', '#777777'),
              style: {
                width: '12px',
                height: '12px',
                margin: '4px'
              }
            })
          ],
          on: ['click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            var _this = this;

            if (youtube.currentMenu && youtube.currentMenu.isShow) {
              youtube.hideCurrentMenu();
              return;
            }

            var menu = youtube.currentMenu = SaveFrom_Utils.popupMenu.quickInsert(_this, language.download + ' ...', 'sf-popupMenu', {
              onShow: function() {
                mono.onRemoveEvent(_this, youtube.hideCurrentMenu);
              },
              onHide: function() {
                mono.offRemoveEvent(_this, youtube.hideCurrentMenu);
              },
              onItemClick: function() {
                "use strict";
                youtube.onMenuItemClick(this.link, {isFeedItem: 1, videoId: vid});
              }
            });

            mono.sendMessage({
              action: 'getYoutubeLinks',
              extVideoId: vid,
              url: location.href,
              checkSubtitles: true
            }, function(response){
              if(response.links) {
                var menuLinks = SaveFrom_Utils.popupMenu.prepareLinks.youtube(response.links, response.title, response.subtitles);
                menu.update(menuLinks);
                return;
              }

              menu.update(language.noLinksFound);
            });

            if ([1].indexOf(preference.cohortIndex) !== -1) {
              mono.sendMessage({action: 'trackCohort', category: 'youtube', event: 'click', label: 'video-playlist'});
            }
          }]
        });
      },

      onImgHover: function() {
        var parent = this.parentNode;
        var vid = parent.dataset.vid;
        if (!vid) {
          if (!this.src) {
            return;
          }
          vid = this.src.match(youtube.videoFeed.imgIdPattern);
          if (!vid) {
            return;
          }
          vid = vid[1];
          if (parent.classList.contains('yt-thumb-clip') || parent.classList.contains('video-thumb') || parent.classList.contains('yt-thumb-simple')) {
            parent = SaveFrom_Utils.getParentByTagName(this, 'A');
          }
          if (!parent) {
            return;
          }
          parent = parent.parentNode;
          if (!SaveFrom_Utils.hasChildrenTagName(parent, 'BUTTON')) {
            return;
          }
        }
        var hasBtn = parent.dataset.sfBtn;
        if (hasBtn) {
          return;
        }
        parent.dataset.sfBtn = '1';

        parent.appendChild(youtube.videoFeed.getBtnNode(vid));
      }
    },

    downloadPlaylist: function() {
      var getIdListFromPage = function(container) {
        var idList = [];
        var imgList = container.querySelectorAll('img[src]');
        var pattern = youtube.videoFeed.imgIdPattern;
        for (var i = 0, el; el = imgList[i]; i++) {
          var matched = el.src.match(pattern);
          if (!matched) {
            continue;
          }
          if (idList.indexOf(matched[1]) === -1) {
            idList.push(matched[1]);
          }
        }

        var dataElList = container.querySelectorAll('*[data-video-id]');
        for (i = 0, el; el = dataElList[i]; i++) {
          var id = el.dataset.videoId;
          if (idList.indexOf(id) === -1) {
            idList.push(id);
          }
        }
        return idList;
      };
      var getIdLinks = function(cb) {
        var container = document;
        var url = mono.parseUrlParams(location.href);
        if (url.list !== undefined) {
          return mono.sendMessage({action: 'getYoutubeIdListFromPlaylist', listId: url.list, baseUrl: location.protocol + '//' + location.host}, function(response) {
            if (!response) {
              return cb();
            }
            if (!response.idList || response.idList.length === 0) {
              var container = document.querySelector(".playlist-videos-container > .playlist-videos-list");
              if (container !== null) {
                response.idList = getIdListFromPage(container);
              }
              if (!response.title) {
                var title = document.querySelector(".playlist-info > .playlist-title");
                if (title !== null) {
                  response.title = title.textContent.replace(/\r?\n/g, " ").trim();
                }
              }
            }
            cb(response.idList, response.title);
          });
        }
        var idList = getIdListFromPage(container);
        cb(idList, youtube.getTitle());
      };
      var getVideoLink = function(vid, maxSize, typeList, cb) {
        var useDash = typeList.indexOf('audio') !== -1;
        mono.sendMessage({action: 'getYoutubeLinks', extVideoId: vid, noDash: useDash}, function(response) {
          var links = undefined;
          if(response.links) {
            links = SaveFrom_Utils.popupMenu.prepareLinks.youtube(response.links, response.title);
            links = SaveFrom_Utils.popupMenu.sortMenuItems(links, {
              noProp: true,
              maxSize: maxSize,
              minSize: 2,
              typeList: typeList
            });
          }
          cb(links);
        });
      };
      var getVideoLinks = function(idList, maxSize, onProgress, onReady) {
        var abort = false;
        var linkList = {};
        var index = 0;
        var inProgress = 0;
        var listLen = idList.length;

        var typeList = undefined;
        if (maxSize === 'audio') {
          typeList = ['audio'];
          maxSize = undefined;
        } else {
          typeList = ['video'];
          maxSize = parseInt(maxSize) || undefined;
        }

        var getNextOneId = function() {
          if (abort) {
            return;
          }
          var id = idList[index];
          if (id === undefined) {
            if (inProgress === 0) {
              return onReady(linkList);
            } else {
              return;
            }
          }
          index++;
          inProgress++;
          getVideoLink(id, maxSize, typeList, function(links) {
            var firstLink = links ? links[0] : undefined;
            if (firstLink) {
              var ext = firstLink.ext;
              if(!ext) {
                ext = firstLink.format.toLowerCase();
              }

              var filename = mono.fileName.modify(firstLink.title + '.' + ext);
              linkList[id] = {url: firstLink.href, title: firstLink.title, filename: filename};
            }
            onProgress(index, listLen);
            inProgress--;
            getNextOneId();
          });
        };
        getNextOneId();
        getNextOneId();
        return {
          abort: function () {
            abort = true;
          }
        }
      };
      var getPopup = function(onClose) {
        var template = SaveFrom_Utils.playlist.getInfoPopupTemplate();
        var progressEl;
        var qualitySelectBox;
        var qualitySelect;

        mono.sendMessage({action: 'getWarningIcon', type: 'playlist', color: '#77D1FA'}, function(icon) {
          template.icon.style.backgroundImage = 'url('+icon+')';
        });

        mono.create(template.textContainer, {
          append: [
            mono.create('p', {
              text: language.playlist,
              style: {
                color: '#0D0D0D',
                fontSize: '20px',
                marginBottom: '11px',
                marginTop: '13px'
              }
            }),
            qualitySelectBox = mono.create('div', {
              append: [
                mono.create('p', {
                  text: language.quality+":",
                  style: {
                    color: '#000000',
                    fontSize: '14px',
                    marginBottom: '13px',
                    lineHeight: '24px'
                  },
                  append: [
                    qualitySelect = mono.create('select', {
                      style: {
                        width: '75px',
                        marginLeft: '5px'
                      },
                      append: [
                        mono.create('option', {
                          text: '720',
                          value: '720'
                        }),
                        mono.create('option', {
                          text: '480',
                          value: '480'
                        }),
                        mono.create('option', {
                          text: '360',
                          value: '360'
                        }),
                        mono.create('option', {
                          text: '240',
                          value: '240'
                        }),
                        mono.create('option', {
                          text: 'Audio',
                          value: 'audio'
                        })
                      ]
                    })
                  ]
                }),
                mono.create('p', {
                  text: language.qualityNote,
                  style: {
                    color: '#868686',
                    fontSize: '14px',
                    lineHeight: '24px'
                  }
                })
              ]
            }),
            progressEl = mono.create('p', {
              text: '',
              style: {
                color: '#868686',
                fontSize: '14px',
                lineHeight: '24px'
              }
            })
          ]
        });

        var continueBtn, cancelBtn;
        mono.create(template.buttonContainer, {
          append: [
            cancelBtn = mono.create('button', {
              text: language.cancel,
              style: {
                height: '27px',
                width: '118px',
                backgroundColor: '#ffffff',
                border: '1px solid #9e9e9e',
                margin: '12px',
                marginBottom: '11px',
                marginRight: '4px',
                borderRadius: '5px',
                fontSize: '14px',
                cursor: 'pointer'
              }
            }),
            continueBtn = mono.create('button', {
              text: language.continue,
              style: {
                height: '27px',
                width: '118px',
                backgroundColor: '#ffffff',
                border: '1px solid #9e9e9e',
                margin: '12px',
                marginBottom: '11px',
                marginRight: '8px',
                borderRadius: '5px',
                fontSize: '14px',
                cursor: 'pointer'
              }
            })
          ]
        });

        var popupEl = SaveFrom_Utils.popupDiv(template.body, 'pl_progress_popup', undefined, undefined, onClose);
        return {
          qualitySelect: function(cb) {
            progressEl.style.display = 'none';
            template.buttonContainer.style.display = 'block';
            qualitySelectBox.style.display = 'block';
            continueBtn.addEventListener('click', function() {
              cb(qualitySelect.value);
            });
            cancelBtn.addEventListener('click', function() {
              mono.trigger(popupEl, 'kill');
            });
          },
          onPrepare: function(text) {
            progressEl.style.display = 'block';
            template.buttonContainer.style.display = 'none';
            qualitySelectBox.style.display = 'none';
            progressEl.textContent = text;
          },
          onProgress: function(count, max) {
            progressEl.textContent = language.vkFoundFiles.replace('%d', count) + ' ' + language.vkFoundOf + ' ' + max;
          },
          onReady: function(list, title) {
            mono.trigger(popupEl, 'kill');
            if (allowDownloadMode) {
              SaveFrom_Utils.downloadList.showBeforeDownloadPopup(list, {
                type: 'playlist',
                folderName: title
              });
            } else {
              SaveFrom_Utils.playlist.popupPlaylist(list, title, true, undefined, 'video');
            }
          },
          onError: function(text) {
            mono.sendMessage({action: 'getWarningIcon', type: 'playlist', color: '#AAAAAA'}, function(icon) {
              template.icon.style.backgroundImage = 'url('+icon+')';
            });

            progressEl.style.display = 'block';
            template.buttonContainer.style.display = 'none';
            qualitySelectBox.style.display = 'none';
            progressEl.textContent = text;
          }
        }
      };
      return function() {
        var abort = false;
        var gettingLink = undefined;
        var popup = getPopup(function onClose() {
          abort = true;
          if (gettingLink) {
            gettingLink.abort();
          }
        });
        popup.qualitySelect(function(maxSize) {
          popup.onPrepare(language.download+' ...');
          getIdLinks(function(idList, title) {
            if (abort) {
              return;
            }
            if (!idList || idList.length === 0) {
              popup.onError(language.noLinksFound);
              return;
            }

            gettingLink = getVideoLinks(idList, maxSize, popup.onProgress, function onReady(linkList) {
              var links = [];
              for (var id in linkList) {
                links.push(linkList[id]);
              }

              var folderName = mono.fileName.modify(title);
              popup.onReady(links, folderName);
            });
          });
        });
        if ([1].indexOf(preference.cohortIndex) !== -1) {
          mono.sendMessage({action: 'trackCohort', category: 'youtube', event: 'click', label: 'video-menu'});
        }
      }
    }(),

    tutorial: {
      show:function(details) {
        "use strict";
        if (!SaveFrom_Utils.tutorialTooltip) {
          return;
        }

        this.hide();

        if (!preference.showTutorial) {
          return;
        }

        mono.storage.get('onceYtTutorialTooltip', function(storage) {
          if (storage.onceYtTutorialTooltip) {
            return;
          }
          storage.onceYtTutorialTooltip = 1;

          details.onClose = function() {
            mono.storage.set(storage);
          };

          youtube.currentTutorial = SaveFrom_Utils.tutorialTooltip.insert(details);
        });
      },
      hide: function() {
        if (youtube.currentTutorial) {
          youtube.currentTutorial._onClose(1);
          youtube.currentTutorial = null;
        }
      }
    }
  };


  var modifyTitle = function(t) {
    t = t.replace(/[\x2F\x5C\x3A\x7C]/g, '-');
    t = t.replace(/[\x2A\x3F]/g, '');
    t = t.replace(/\x22/g, '\'');
    t = t.replace(/\x3C/g, '(');
    t = t.replace(/\x3E/g, ')');
    t = t.replace(/(?:^\s+)|(?:\s+$)/g, '');
    return t;
  };

  var getPlayerConfig = function(cb) {
    SaveFrom_Utils.bridge({
      func: function(cb) {
        var ytPlayerConfig = window.ytplayer && window.ytplayer.config;
        if (!ytPlayerConfig) {
          return cb();
        }
        cb({
          args: ytPlayerConfig.args,
          sts: ytPlayerConfig.sts,
          assets: ytPlayerConfig.assets
        })
      },
      timeout: 300,
      cb: function(data) {
        if (!data || !data.args || !data.args.video_id) {
          var metaVideoId = document.querySelector('#watch7-content meta[itemprop="videoId"]');
          var videoId = metaVideoId && metaVideoId.getAttribute('content');
          if (videoId) {
            data = data || {};
            data.args = data.args || {};
            data.args.video_id = videoId;
          }
        }

        cb(data);
      }
    });
  };

  var ytUmmyBtn = function(language, preferences, videoId) {
    "use strict";
    ytUmmyBtn.rmBtn();

    if (!preferences.showUmmyItem) {
      return;
    }

    if (!preferences.showUmmyBtn) {
      return;
    }

    var url = 'ummy://www.youtube.com/watch?v=' + videoId;
    var vid = 130;

    var textNode = document.createTextNode(language.download + ' HD');

    var ummyLogo = mono.create('i', {
      style: {
        position: 'absolute',
        display: 'inline-block',
        left: '6px',
        top: '3px',
        backgroundSize: '16px',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        width: '16px',
        height: '16px'
      }
    });
    mono.sendMessage({action: 'getUmmyIcon'}, function(dataImg) {
      ummyLogo.style.backgroundImage = 'url('+dataImg+')';
    });
    var btn = mono.create('div', {
      id: ytUmmyBtn.id,
      style: {
        display: 'inline-block',
        marginLeft: '10px',
        verticalAlign: 'middle'
      },
      on: ['changeValue', function(e) {
        var value = JSON.parse(e.detail);
        var newTextNode = document.createTextNode(language.download + ' '  + value);
        textNode.parentNode.replaceChild(newTextNode, textNode);
        textNode = newTextNode;
      }],
      append: [
        mono.create('a', {
          class: 'sf-quick-dl-btn',
          style: {
            display: 'inline-block',
            fontSize: 'inherit',
            height: '22px',
            border: '1px solid #CCCCCC',
            borderRadius: '3px',
            paddingRight: '8px',
            paddingLeft: '28px',
            cursor: 'pointer',
            verticalAlign: 'middle',
            position: 'relative',
            lineHeight: '22px',
            textDecoration: 'none',
            zIndex: 1,
            color: '#575757'
          },
          href: url,
          append: [
            ummyLogo,
            textNode
          ],
          on: ['click', function() {
            if (this.href.indexOf('ummy') !== 0) {
              return;
            }
            mono.sendMessage({action: 'trackEvent', category: 'youtube', event: 'download', label: 'ummy hd'});
          }]
        }),
        mono.create('style', {text: '' +
        '#' + ytUmmyBtn.id + ' .sf-quick-dl-btn {' +
        'background-color: #F8F8F8;' +
        '}' +
        '#' + ytUmmyBtn.id + ' .sf-quick-dl-btn:hover {' +
        'background-color: #EDEDED;' +
        '}' +
        '#' + ytUmmyBtn.id + ' .sf-quick-dl-btn:active {' +
        'background-color: #F8F8F8;' +
        '}' +
        '@media screen and (max-width: 1293px) {'
        + '#' + ytUmmyBtn.id + ' .sf-quick-dl-btn {'
        + '' + 'display: none !important;'
        + '}' +
        '}' +
        ''})
      ]
    });
    ytUmmyDirect.bindUmmyBtn(btn, {video: 'yt-' + videoId, vid: vid});

    return btn;
  };
  ytUmmyBtn.id = 'sf-ummy-btn';
  ytUmmyBtn.rmBtn = function() {
    "use strict";
    var btnList = document.querySelectorAll('#' + ytUmmyBtn.id);
    for (var i = 0, el; el = btnList[i]; i++) {
      el.parentNode.removeChild(el);
    }
  };

  var ytUmmyDirect = {
    createInfoPopup: function(yesUrl, noUrl) {
      "use strict";
      var language = mono.global.language;

      var info;
      var infoContainer = mono.create('div', {
        class: 'sf-ummy-info-confirm-popup-container',
        style: {
          position: 'absolute',
          zIndex: 9999
        },
        append: [
          mono.create('span', {
            style: {
              display: 'inline-block',
              border: '8px solid transparent',
              borderRight: '10px solid rgb(192, 187, 187)',
              borderLeft: 0,
              width: 0,
              top: '8px',
              left: '11px',
              position: 'absolute'
            }
          }),
          mono.create('span', {
            style: {
              display: 'inline-block',
              border: '8px solid transparent',
              borderRight: '10px solid #fff',
              borderLeft: 0,
              width: 0,
              top: '8px',
              left: '12px',
              position: 'absolute'
            }
          }),
          info = mono.create('div', {
            class: 'sf-ummy-confirm-info-popup',
            style: {
              backgroundColor: '#fff',
              border: '1px solid #ccc',
              marginLeft: '21px',
              padding: '6px 5px',
              textAlign: 'center',
              maxWidth: '240px',
              lineHeight: '16px',
              fontSize: '12px',
              fontFamily: 'arial, sans-serif',
              cursor: 'default'
            },
            append: [
              mono.create('p', {
                append: mono.parseTemplate(language.ummyTooltipConfirm),
                onCreate: function(el) {
                  var img = el.querySelector('img');
                  img.style.verticalAlign = 'text-bottom';
                  mono.sendMessage({action: 'getUmmyIcon'}, function(dataImg) {
                    img.src = dataImg;
                  });
                }
              }),
              mono.create('p', {
                style: {
                  textAlign: 'right'
                },
                append: [
                  mono.create('a', {
                    class: 'sf-btn',
                    style: {
                      cssFloat: 'left'
                    },
                    text: language.yes,
                    href: yesUrl,
                    on: ['click', function(e) {
                      setTimeout(function() {
                        mono.storage.get('onceUmmyLandingHide', function(storage) {
                          mono.storage.set({
                            onceUmmyLandingHide: ++storage.onceUmmyLandingHide
                          });

                          infoContainer.parentNode.removeChild(infoContainer);
                          infoContainer.dataset.hide = '1';
                        }, 250);
                      });
                    }]
                  }),
                  mono.create('a', {
                    class: 'sf-btn',
                    text: language.no,
                    href: noUrl,
                    target: '_blank'
                  })
                ]
              }),
              mono.create('p', {
                append: [
                  mono.create('label', {
                    append: [
                      mono.create('input', {
                        type: 'checkbox',
                        on: ['change', function() {
                          mono.storage.set({onceUmmyLandingHide: 3});

                          infoContainer.parentNode.removeChild(infoContainer);
                          infoContainer.dataset.hide = '1';
                        }]
                      }),
                      mono.create('span', {
                        text: language.tooltipHide
                      })
                    ]
                  })
                ]
              }),
              mono.create('style', {
                text: '' +
                '.sf-ummy-confirm-info-popup > p {'
                + 'margin: 5px 0;' +
                '}' +
                '.sf-ummy-confirm-info-popup label > * {'
                + 'vertical-align: middle;' +
                '}' +
                '.sf-ummy-confirm-info-popup .sf-btn {'
                + 'display: inline-block;'
                + 'font-size: inherit;'
                + 'height: 22px;'
                + 'border: 1px solid rgb(204, 204, 204);'
                + 'border-radius: 3px;'
                + 'cursor: pointer;'
                + 'vertical-align: middle;'
                + 'position: relative;'
                + 'line-height: 22px;'
                + 'text-decoration: none;'
                + 'color: rgb(87, 87, 87);'
                + 'text-align: center;'
                + 'margin: 0 10px;'
                + 'width: 80px;' +
                '}' +
                '.sf-ummy-confirm-info-popup .sf-btn:hover {' +
                'background-color: #ededed;' +
                '}'
              })
            ]
          })
        ],
        on: [
          ['mouseclick', function(e) {
            e.stopPropagation();
          }],
          ['mousedown', function(e) {
            e.stopPropagation();
          }]]
      });

      return infoContainer;
    },
    bindUmmyBtn: function(container, params) {
      "use strict";
      if (!preference.showUmmyLanding) {
        return;
      }

      var url = 'http://videodownloader.ummy.net/assets/UmmyVD-Web-Loader-[' + params.vid + '-' + params.video + '].exe';
      if (/^Mac/.test(navigator.platform)) {
        url = 'http://videodownloader.ummy.net/mac.html?utm_campaign=helper_mac&utm_medium=download_button&utm_source=helper_mac';
      }
      mono.storage.get(['onceUmmyLandingOpened', 'onceUmmyLandingHide'], function(storage) {
        if (!storage.onceUmmyLandingHide) {
          storage.onceUmmyLandingHide = 0;
          if (storage.onceUmmyLandingHide !== 0) {
            mono.storage.set({onceUmmyLandingHide: 0});
          }
        }

        if (storage.onceUmmyLandingHide > 2) {
          return;
        }

        var btn = container.querySelector('a');
        var href = btn.href;

        if (storage.onceUmmyLandingOpened) {
          return SaveFrom_Utils.bindUmmyInfo(container, {}, {
            expUmmyInfo: this.createInfoPopup.bind(this, href, url)
          });
        }

        btn.target = '_blank';
        btn.href = url;
        btn.addEventListener('click', function() {
          setTimeout(function() {
            mono.storage.set({onceUmmyLandingOpened: 1});
            btn.target = '_self';
            btn.href = href;
            SaveFrom_Utils.bindUmmyInfo(container, {}, {
              expUmmyInfo: this.createInfoPopup.bind(this, href, url)
            });
          }.bind(this), 250);
        }.bind(this));
      }.bind(this));
    }
  };

}, null, function syncIsActive() {
  "use strict";

  if (mono.isSafari || mono.isGM) {
    if (!mono.checkUrl(document.URL, [
        'http://youtube.com/*',
        'http://*.youtube.com/*',
        'https://youtube.com/*',
        'https://*.youtube.com/*'
      ])) {
      return false;
    }
  }

  if (/\/\/gaming\.youtube/.test(document.URL)) {
    return false;
  }

  return true;
});

//@insert