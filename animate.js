var GLOBAL_SETTINGS = {
    "queryParameters": (function (a) {
        if (a == "") return {};
        var b = {};
        for (var i = 0; i < a.length; ++i) {
            var p = a[i].split('=', 2);
            if (p.length == 1)
                b[p[0]] = "";
            else
                b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
        }
        return b;
    })(window.location.search.substr(1).split('&')),
    "canvasId": "canvas"
};

var getCanvas = function () {
    return $("#" + GLOBAL_SETTINGS.canvasId);
};

var getCanvasNatively = function(){
    return document.getElementById("drawingCanvas");
};

var currentScene = 0;
var scenes = [];


var loadModel = function(){
    var model = GLOBAL_SETTINGS.queryParameters["model"];
    model = JSON.parse(decodeURIComponent(model));
    renderModel(model);

    // $.get("smallModel.json", function (modelData) {
    //     var renderedData = typeof modelData === 'object' ? modelData : JSON.parse(modelData);
    //     renderModel(renderedData);
    // });
};

var renderModel = function (modelData) {
    $.each(modelData.scenes, function (index, value) {
        scenes.push(value);
    });
    playScene();
};

var playScene = function () {
    getCanvas().addClass("fadeOut");
    getCanvas().removeClass("fadeIn");
    setTimeout(function () {
        getCanvas().removeClass("fadeOut");
        getCanvas().addClass("fadeIn");

        getCanvas().empty();
        if (currentScene < scenes.length) {
            var scene = scenes[currentScene];
            if(scene.animation!==undefined && scene.animation!==null){
                $.get("animations/"+scene.animation+"/"+scene.animation+".json", function(data){
                    var animation = typeof data === 'object' ? data : JSON.parse(data);
                    if(animation!==undefined && animation!==null) {
                        $.each(animation.components, function (index, component) {
                            renderElementWithAnimation(component, getCanvas(), scene);
                        });
                        currentScene++;
                        setTimeout(playScene, animation.duration);
                    }
                });
            }
        }
        else {
            getCanvas().html("<h1>Fin</h1>");
        }
    }, 2000);

};


var record = function(){
    var canvas = getCanvasNatively();
    if(canvas!==null) {
        console.log(getCanvasNatively().toDataURL());
    }
    window.setTimeout(record, 2000);

};

record();


var elementId = 0;

var transformMotionPath = function (originalPath) {
    //TODO transform path accoring to scaling values;
    return originalPath;
};


var renderElementWithAnimation = function (element, parentElement, scene) {
    var id = elementId++;
    var svgContainerIdPrefix = "svgContainer";
    var svgContainerWrapperIdPrefix = "svgContainerWrapper";

    if(element.svg!==undefined && element.svg!==null) {
        $.get("animations/" + scene.animation + "/" + element.svg + "?" + id, function (svgData) {
            var index = parseInt(this.url.split("?")[1]);
            var svgContainerWrapper = $("<div class=\"svgContainerWrapper\" id=\"" + svgContainerWrapperIdPrefix + index + "\"><div id=\"" + svgContainerIdPrefix + index + "\" class=\"svgContainer\"></div></div>");
            var svgContainer = $(svgContainerWrapper.children()[0]);
            if (element.style !== undefined) {
                //Add defined css styles to wrapper element
                $.each(element.style, function (key, styleValue) {
                    svgContainerWrapper.css(key, styleValue);
                });
            }
            svgContainer.append(svgData.rootElement);

            var added = false;
            $.each(parentElement.children(), function (i, child) {
                child = $(child);
                if (child.attr("id").indexOf(svgContainerWrapperIdPrefix > -1)) {
                    var indexOfCurrentItem = parseInt(child.attr("id").substring(svgContainerWrapperIdPrefix.length));
                    if (index < indexOfCurrentItem) {
                        svgContainerWrapper.insertBefore(child);
                        added = true;
                    }
                }
            }).promise().done(function () {
                if (!added) {
                    parentElement.append(svgContainerWrapper);
                }
            });


            if (element.viewbox !== undefined) {
                svgContainer.children()[0].setAttribute("viewBox", element.viewbox);
            }
            else {
                var predefinedWidth = svgContainer.children()[0].getAttribute("width");
                var predefinedHeight = svgContainer.children()[0].getAttribute("height");
                if (predefinedHeight !== undefined && predefinedHeight !== null && predefinedWidth !== undefined && predefinedWidth !== null) {
                    svgContainer.children()[0].setAttribute("viewBox", "0 0 " + predefinedWidth + " " + predefinedHeight);
                }
            }

            if (element.width !== undefined) {
                svgContainerWrapper.css("width", element.width + "px");
                svgContainer.children()[0].setAttribute("width", element.width + "px");
            }

            if (element.height !== undefined) {
                svgContainerWrapper.css("height", element.height + "px");
                svgContainer.children()[0].setAttribute("height", element.height + "px");
            }


            //Parametrize object
            if (scene.parameters !== undefined && scene !== null) {
                $.each(scene.parameters, function (key, value) {
                    var element = svgContainer.find(".parametrizable." + key);
                    if (element !== undefined && element.length > 0) {
                        $.each(element, function (i, el) {
                            el.textContent = value;
                        });
                    }
                });
            }

            //Manage defined animations
            if (element.animations !== undefined) {
                $.each(element.animations, function (key, animation) {
                    if (animation.enabled === undefined || animation.enabled) {
                        if (animation.css !== undefined) {
                            $.each(animation.css, function (key, css) {
                                if (key === "motionPath") {
                                    if (css.toLowerCase().indexOf("path") !== 0) {
                                        var path = svgContainer.find("." + css);
                                        if (path !== undefined && path !== null) {
                                            svgContainerWrapper.css(key, transformMotionPath("path('" + path.attr("d") + "')"));
                                            handled = true;
                                        }
                                    }
                                    else {
                                        svgContainerWrapper.css(key, transformMotionPath(css));
                                    }
                                    document.getElementById(svgContainerWrapperIdPrefix + id).animate(
                                        animation.animation, animation.timing
                                    );
                                }
                                else {
                                    svgContainerWrapper.css(key, css);
                                }
                            });
                        }
                        document.getElementById(svgContainerIdPrefix + id).animate(
                            animation.animation, animation.timing
                        );
                        //Override by animation specific parameters
                        $.each(animation.parameters, function (key, value) {
                            var element = svgContainer.find(".parametrizable." + key);
                            if (element !== undefined) {
                                element[0].textContent = value;
                            }
                        });
                    }
                });
            }

            if (element.subElements !== undefined) {
                $.each(element.subElements, function (key, subElement) {
                    var handled = false;
                    if (subElement.hook !== undefined) {
                        var hooks = svgContainer.find("." + subElement.hook);
                        $.each(hooks, function (idx, hookElement) {
                            renderElementWithAnimation(subElement, $(hookElement), scene);
                            handled = true;
                        })
                    }
                    if (!handled) {
                        renderElementWithAnimation(subElement, svgContainer, scene);
                    }
                })
            }
        });
    }
    else if(element.image!==undefined && element.image!==null){
        var svgContainerWrapper = $("<div class=\"svgContainerWrapper\" id=\"" + svgContainerWrapperIdPrefix + id + "\"><div id=\"" + svgContainerIdPrefix + id + "\" class=\"svgContainer\"><img src=\"animations/" + scene.animation + "/"+element.image+"\" style=\"width: "+element.width+"px; height: "+element.height+"px;\"/></div></div>");
        parentElement.append(svgContainerWrapper);
    }
};