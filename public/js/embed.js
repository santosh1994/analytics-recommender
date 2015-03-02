if(typeof(Unbxd) === 'undefined')
    window.Unbxd = {};

(function($){
    var key = function(){
        if(typeof(UnbxdKey) != 'undefined' && UnbxdKey != ""){
            return UnbxdKey;        
        }

        if(typeof(UnbxdSiteName) != 'undefined' && UnbxdSiteName != ""){
            return UnbxdSiteName;       
        }

        return false;
    }

    function decode(s) {
        return decodeURIComponent(s.replace(/\+/g, ' '));
    }

    function decodeAndParse(s) {
        if (s.indexOf('"') === 0) {
            // This is a quoted cookie as according to RFC2068, unescape...
            s = s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        }

        s = decode(s);
        return s;
    }

    var readCookie = function(key){
        // Read
        var cookies = document.cookie.split('; ');
        var result = key ? undefined : {};
        for (var i = 0, l = cookies.length; i < l; i++) {
            var parts = cookies[i].split('=');
            var name = decode(parts.shift());
            var cookie = parts.join('=');

            if (key && key === name) {
                try{
                    result = decodeAndParse(cookie);
                    break;
                }catch(e){}
            }
        }

        return result;
    }

    var widgetsLoaded = false;

    var render = function(){
        if(key() == false) return;

        var uid = readCookie('unbxd.userId');

        var unbxd_recommender_url = "//recommendations.unbxdapi.com/";
        if(window.UnbxdMode && window.UnbxdMode == 'local'){
            var unbxd_recommender_url = "/";    
        }

        var appendCurrency = function(path){
            if(typeof(UnbxdWidgetsConf) != 'undefined' && UnbxdWidgetsConf.currency){
                path = path + "&currency=" + UnbxdWidgetsConf.currency;
            }
            return path;
        }

        var appendUid = function(path){
            if(uid && uid != ''){
                path = path + "&uid=" + uid;
            }
            return path;
        }

        var getWidth = function(){
            if( typeof( window.innerWidth ) == 'number' ) {
            //Non-IE
                return window.innerWidth;
            } else if( document.documentElement && document.documentElement.clientWidth) {
                //IE 6+ in 'standards compliant mode'
                return document.documentElement.clientWidth;
            }

            return screen.width;
        }

        var load = function(path){
            path = appendCurrency(path);
            path = appendUid(path);

            path = path + "&screenWidth=" + getWidth();
            
            var ubx = document.createElement('script'); ubx.type = 'text/javascript'; ubx.async = true;
            ubx.src = unbxd_recommender_url + "v1.0/" + UnbxdApiKey + "/" + key() + path;
            (document.getElementsByTagName('head')[0] || document.getElementsByTagName('body')[0]).appendChild(ubx);
        }

        var tryToRender = function(id, url){
            if(typeof(jQuery) != 'undefined' && jQuery(id).length > 0){ 
                load(url);
                widgetsLoaded = true;
            } else {
                setTimeout(function(){
                    tryToRender(id, url);
                }, 100);
            }
        }

        // UID based widgets
        if(uid && uid != ''){
            tryToRender('#unbxd_recently_viewed', "/recently-viewed/" + uid + "/?cont=unbxd_recently_viewed");
            tryToRender('#unbxd_recommended_for_you', "/recommend/" + uid + "/?cont=unbxd_recommended_for_you");
            tryToRender('#unbxd_cart_recommendations', "/cart-recommend/" + uid + "/?cont=unbxd_cart_recommendations");
        }else{
            tryToRender('#unbxd_recommended_for_you', "/recommend/?cont=unbxd_recommended_for_you");
        }

        // PID based widgets
        if(typeof(UnbxdWidgetsConf) != 'undefined' && UnbxdWidgetsConf.pid){
            var pid = UnbxdWidgetsConf.pid;

            tryToRender('#unbxd_also_viewed', "/also-viewed/" + pid + "/?cont=unbxd_also_viewed");
            tryToRender('#unbxd_also_bought', "/also-bought/" + pid + "/?cont=unbxd_also_bought");
            tryToRender('#unbxd_more_like_these', "/more-like-these/" + pid + "/?cont=unbxd_more_like_these");
            tryToRender('#unbxd_pdp_top_sellers', "/pdp-top-sellers/" + pid + "/?cont=unbxd_pdp_top_sellers");
        }

        //  Top Seller widgets
        tryToRender('#unbxd_top_sellers', "/top-sellers?cont=unbxd_top_sellers");

        if(typeof(UnbxdWidgetsConf) != 'undefined' && UnbxdWidgetsConf.category){
            var category = UnbxdWidgetsConf.category;
            tryToRender('#unbxd_category_top_sellers', "/category-top-sellers/" + category + "/?cont=unbxd_category_top_sellers");
        }

        if(typeof(UnbxdWidgetsConf) != 'undefined' && UnbxdWidgetsConf.brand){
            var brand = UnbxdWidgetsConf.brand;
            tryToRender('#unbxd_brand_top_sellers', "/brand-top-sellers/" + brand + "/?cont=unbxd_brand_top_sellers");
        }
    }

    render();

    Unbxd.refreshWidgets = function(){
        if(!widgetsLoaded)
            return;

        render();
    }    

    setInterval(function(){
        if(Unbxd.gatherImpressions != undefined && Unbxd.bootState == 4)
            Unbxd.gatherImpressions();
    }, 1000);
})(jQuery);
