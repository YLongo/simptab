
define([ "jquery", "lodash", "notify", "i18n", "vo", "date", "error", "files" ], function( $, _, Notify, i18n, vo, date, SimpError, files ) {

    "use strict";

    var rTmpl = '\
                <div class="close"><span class="close"></span></div>\
                <div class="tabs">\
                    <div class="tab" idx="0">' + i18n.GetLang( "manage_tab_fav" ) + '</div>\
                    <div class="tab tab-active" idx="1">' + i18n.GetLang( "manage_tab_sub" ) + '</div>\
                </div>\
                <div class="albums">\
                    <div class="album favorite"><div class="empty">Loading...</div></div>\
                    <div class="album subscribe album-active"><div class="empty">Loading...</div></div>\
                </div>',
        favTmpl = '\
                <div class="photograph">\
                    <img src=<%- album %>>\
                    <ul class="toolbox">\
                        <li><span data-balloon="' + i18n.GetLang( "manage_toolbar_use"    ) + '" data-balloon-pos="up" class="useicon"></span></li>\
                        <li><span data-balloon="' + i18n.GetLang( "manage_toolbar_down"   ) + '" data-balloon-pos="up" class="downicon"></span></li>\
                        <li><span data-balloon="' + i18n.GetLang( "manage_toolbar_remove" ) + '" data-balloon-pos="up" class="removeicon"></span></li>\
                    </ul>\
                </div>',
        subTmpl = '\
                <div class="photograph">\
                    <div class="photos">\
                        <div class="title"><%= title %></div>\
                        <div class="desc"><%= desc %></div>\
                        <div class="images">\
                            <%= images %>\
                        </div>\
                    </div>\
                </div>',
        imgTmpl = '\
                <div class="image">\
                    <img src=<%- image.url %>>\
                    <ul class="toolbox">\
                        <li>\
                            <a href="<%= image.contact == "" ? "#" : image.contact %>" target="<%= image.contact == "" ? "_self" : "_blank" %>">\
                                <span data-balloon="<%= image.name == "" ? "暂无" : image.name %>" data-balloon-pos="up" class="authoricon"></span>\
                            </a>\
                        </li>\
                        <li><a href="<%= image.info %>" target="_blank"><span class="linkicon"></span></a></li>\
                        <li><span data-vo="<%= encodeURI(JSON.stringify( image )) %>" data-balloon="' + i18n.GetLang( "manage_toolbar_use"    ) + '" data-balloon-pos="up" class="useicon"></span></li>\
                        <li><span data-balloon="' + i18n.GetLang( "manage_toolbar_down"   ) + '" data-balloon-pos="up" class="downicon"></span></li>\
                    </ul>\
                </div>';

    function closeListenEvent() {
        $( ".manage .close" ).click( function( event ) {
            $( "body" ).off( "click", ".manage .toolbox span" );
            $( ".manage-bg" ).removeClass( "manage-bg-show" );
            setTimeout( function() {
                $( ".manage-overlay" ).remove();
            }, 400 );
        });
    }

    function tabListenEvent() {
        $( ".manage .tab" ).click( function( event ) {
            var $target = $( event.target ),
                idx     = $target.attr( "idx" );
            $( ".manage .tab" ).removeClass( "tab-active" );
            $target.addClass( "tab-active" );

            $( ".manage .album" ).removeClass( "album-active" );
            $( $( ".manage .album" )[idx] ).addClass( "album-active" );
        });
    }

    function toolbarListenEvent() {
        $( "body" ).on( "click", ".manage .toolbox span", function( event ) {
            var url    = $( event.target ).parent().parent().prev().attr( "src" ),
                new_vo = $( event.target ).attr( "data-vo" ),
                name   = url.replace( vo.constructor.FAVORITE, "" ).replace( ".jpg", "" );
            switch( event.target.className ) {
                case "useicon":
                    new_vo && ( new_vo = JSON.parse( decodeURI( new_vo )) );
                    setBackground( url, name, new_vo );
                    break;
                case "downicon":
                    var title = "SimpTab-Favorite-" + url.replace( vo.constructor.FAVORITE, "" );
                    files.Download( url, title );
                    break;
                case "removeicon":
                    files.Delete( name, function( result ) {
                        new Notify().Render( "已删除当前背景" );
                        $( event.target ).parent().parent().parent().slideUp( function() {
                            $( event.target ).parent().parent().parent().remove();
                        });
                        files.DeleteFavorite( files.FavoriteVO(), name );
                    }, function( error ) {
                        new Notify().Render( 2, "删除错误，请重新操作。" );
                    });
                    break;
            }
        });
    }

    function subscribe2VO( new_vo ) {
        vo.cur.hdurl = new_vo.url;
        vo.cur.url   = new_vo.url;
        vo.cur.info  = new_vo.info;
        vo.cur.name  = new_vo.origin;
        vo.cur.favorite = -1;
        delete vo.cur.apis_vo;
    }

    function setBackground( url, name, new_vo ) {
        // set vo.cur
        var type = new_vo == undefined ? "favorite" : "subscribe";
        new_vo == undefined && ( new_vo = files.FindFavorite( files.FavoriteVO(), name ));
        //new_vo = new_vo == undefined ? files.FindFavorite( files.FavoriteVO(), name ) : new_vo;
        if ( new_vo ) {
            type == "subscribe" && new Notify().Render( "正在应用中，请稍后..." );
            // save favorite to background.jpg
            files.GetDataURI( url ).then( function( result ) {
                files.Add( vo.constructor.BACKGROUND, result )
                    .progress( function( result ) { console.log( "Write process:", result ); })
                    .fail(     function( result ) { console.log( "Write error: ", result );  })
                    .done( function( result ) {
                        console.log( "Write completed: ", result );
                        type == "favorite" ? vo.cur = new_vo : subscribe2VO( new_vo );
                        vo.Set( vo.cur );
                        console.log( "======= Current background dispin success.", vo )
                        new Notify().Render( "设置成功。" );
                    });
            });
            // hack code( source copie from background.js → updateBackground() )
            // change background
            $( "body" ).css( "background-image", 'url("' + url + '")' );
            // change background mask
            $( "head" ).find( ".bgmask-filter" ).html( '<style class="bgmask-filter">.bgmask::before{background: url(' + url + ')}</style>' );
            $( "body" ).find( ".img-bg > img" ).attr( "src", url );
            // change conntrolbar download url and info
            $($( ".controlbar" ).find( "a" )[4]).attr( "href", url );
            $( ".controlbar" ).find( "a[url=info]" ).prev().text( vo.cur.type );
        }
    }

    function getFavoriteTmpl() {
        files.List( function( result ) {
            if ( result.length > 0 ) {
                var compiled = _.template( '<% jq.each( albums, function( idx, album ) { %>' + favTmpl + '<% }); %>', { 'imports': { 'jq': jQuery }} ),
                    html     = compiled({ 'albums': result });
                $( ".manage .albums .favorite" ).html( html );
            } else $( ".manage .empty" ).text( "暂时没有任何收藏的图片" );
        });
    }

    function getSubscribe( callback ) {
        $.ajax({
            type       : "GET",
            url        : "http://simptab.qiniudn.com/special.day.v2.json?_=" + Math.round(+new Date()),
            dataType   : "json"
        }).then( function( result ) {
            if ( result && result.collections ) {
                var category    = result.category,
                    collections = result.collections,
                    len         = collections.length,
                    albums      = {},
                    album;
                for( var i = 0; i < len; i++ ) {
                    album = collections[i];
                    if ( !albums[ album.create ] ) {
                        albums[ album.create ] = [ album ];
                    } else albums[ album.create ].push( album );
                }
                callback( albums, category );
            } else callback( undefined, undefined, "remote json error" );
        }, function( jqXHR, textStatus, errorThrown ) {
            callback( undefined, undefined, textStatus );
        });
    }

    function getSubscribeTmpl() {
        getSubscribe( function( albums, category, error ) {
            if ( error ) new Notify().Render( 2, "获取订阅源错误，请稍后再试。" );
            else {
                var html = "";
                Object.keys( albums ).forEach( function( idx ) {
                    // get title and desc
                    var lang   = i18n.GetLocale(),
                        title  = category[idx]["lang"][lang].title,
                        desc   = category[idx]["lang"][lang].desc,
                        images = albums[idx];

                    // get images html template
                    var imgComp  = _.template( '<% jq.each( images, function( idx, image ) { %>' + imgTmpl + '<% }); %>', { 'imports': { 'jq': jQuery }} ),
                        imgHtml  = imgComp({ 'images': images });

                    // get subscribe html template
                    var scribComp = _.template( subTmpl ),
                        scribHTML = scribComp({ title: title, desc: desc, images: imgHtml });

                    html += scribHTML;
                });
                $( ".manage .albums .subscribe" ).html( html );
            }
        });
    }

    return {
        Render: function () {
            $( "body" ).append( '<div class="manage-overlay"><div class="manage-bg"><div class="manage"></div></div></div>' );
            setTimeout( function() {
                $( ".manage-bg" ).addClass( "manage-bg-show" );
                $( ".manage" ).html( rTmpl );
                closeListenEvent();
                tabListenEvent();
                getFavoriteTmpl();
                getSubscribeTmpl();
                toolbarListenEvent();
            }, 10 );
        }
    };
});