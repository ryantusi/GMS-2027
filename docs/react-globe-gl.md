react-globe.gl
==============


React bindings for the [globe.gl](https://github.com/vasturiano/globe.gl) UI component.

See also the [react-three-fiber component](https://github.com/vasturiano/r3f-globe).

A React component to represent data visualization layers on a 3-dimensional globe in a spherical projection, using [ThreeJS](https://github.com/mrdoob/three.js/)/WebGL for 3D rendering.



## Quick start

```js
import Globe from 'react-globe.gl';
```

or using a *script* tag

```html
<script src="//cdn.jsdelivr.net/npm/react-globe.gl"></script>
```

then

```jsx
ReactDOM.render(
  <Globe
    pointsData={myData}
  />, 
  myDOMElement
);
```

### Container Layout

| Prop | Type | Default | Description |
| --- | :--: | :--: | --- |
| <b>width</b> | <i>number</i> | *&lt;window width&gt;* | Canvas width. |
| <b>height</b> | <i>number</i> | *&lt;window height&gt;* | Canvas height. |
| <b>globeOffset</b> | <i>[number, number]</i> | `[0, 0]` | Position offset of the globe relative to the canvas center. |
| <b>backgroundColor</b> | <i>string</i> | `#000011` | Background color. |
| <b>backgroundImageUrl</b> | <i>string</i> | *-* | URL of the image to be used as background to the globe. If no image is provided, the background color is shown instead. |
| <b>waitForGlobeReady</b> | <i>bool</i> | `true` | Whether to wait until the globe wrapping or background image has been fully loaded before rendering the globe or any of the data layers. |
| <b>animateIn</b> | <i>bool</i> | `true` | Whether to animate the globe initialization, by scaling and rotating the globe into its initial position. This prop only has an effect on component mount. |

### Globe Layer

| Prop | Type | Default | Description |
| --- | :--: | :--: | --- |
| <b>globeImageUrl</b> | <i>string</i>| *-* | URL of the image used in the material that wraps the globe. This image should follow an [equirectangular projection](https://en.wikipedia.org/wiki/Equirectangular_projection). If no image is provided, the globe is represented as a black sphere. |
| <b>bumpImageUrl</b> | <i>string</i>| *-* | URL of the image used to create a [bump map](https://threejs.org/docs/#api/en/materials/MeshStandardMaterial.bumpMap) in the material, to represent the globe's terrain. This image should follow an [equirectangular projection](https://en.wikipedia.org/wiki/Equirectangular_projection). |
| <b>globeTileEngineUrl</b> | <i>func(x, y, l)</i> | *-* | Function that defines the URL of the [slippy map](https://en.wikipedia.org/wiki/Tiled_web_map) tile engine to cover the globe surface. The slippy map coordinates `x`, `y` and `l` (zoom level) are passed as arguments and the function is expected to return a URL string. A falsy value will disable the tiling engine. |
| <b>showGlobe</b> | <i>bool</i> | `true` | Whether to show the globe surface itself. |
| <b>showGraticules</b> | <i>bool</i> | `false` | Whether to show a graticule grid demarking latitude and longitude lines at every 10 degrees. |
| <b>showAtmosphere</b> | <i>bool</i> | `true` | Whether to show a bright halo surrounding the globe, representing the atmosphere. |
| <b>atmosphereColor</b> | <i>string</i> | `lightskyblue` | The color of the atmosphere. |
| <b>atmosphereAltitude</b> | <i>string</i> | 0.15 | The max altitude of the atmosphere, in terms of globe radius units. |
| <b>globeCurvatureResolution</b> | <i>number</i> | 4 | Resolution in angular degrees of the sphere curvature. The finer the resolution, the more the globe is fragmented into smaller faces to approximate the spheric surface, at the cost of performance. |
| <b>globeMaterial</b> | <i>Material</i> | [MeshPhongMaterial](https://threejs.org/docs/#api/en/materials/MeshPhongMaterial) | ThreeJS material used to wrap the globe. Can be used for more advanced styling of the globe, like in [this example](https://github.com/vasturiano/react-globe.gl/blob/master/example/custom-globe-styling/index.html). |
| <b>onGlobeReady</b> | <i>func</i> | *-* | Callback function to invoke immediately after the globe has been initialized and visible on the scene. |
| <b>onGlobeClick</b> | <i>func</i> | *-* | Callback function for (left-button) clicks on the globe. The clicked globe coordinates and the event object are included as arguments: `onGlobeClick({ lat, lng }, event)`. |
| <b>onGlobeRightClick</b> | <i>func</i> | *-* | Callback function for right-clicks on the globe. The clicked globe coordinates and the event object are included as arguments: `onGlobeRightClick({ lat, lng }, event)`. |

| Method | Arguments | Description |
| --- | :--: | --- |
| <b>globeTileEngineClearCache</b> | *-* | Clear the tile engine cache. |

### Points Layer

<p align="center">
   <a href="//vasturiano.github.io/react-globe.gl/example/basic/"><img width="70%" src="https://vasturiano.github.io/react-globe.gl/example/basic/preview.png"></a>
</p>

| Prop | Type | Default | Description |
| --- | :--: | :--: | --- |
| <b>pointsData</b> | <i>array</i> | `[]` | List of points to represent in the points map layer. Each point is displayed as a cylindrical 3D object rising perpendicularly from the surface of the globe. |
| <b>pointLabel</b> | <i>string</i> or <i>func</i> | `name` | Point object accessor function or attribute for label (shown as tooltip). Supports plain text or HTML content. |
| <b>pointLat</b> | <i>number</i>, <i>string</i> or <i>func</i> | `lat` | Point object accessor function, attribute or a numeric constant for the cylinder's center latitude coordinate. |
| <b>pointLng</b> | <i>number</i>, <i>string</i> or <i>func</i> | `lng` | Point object accessor function, attribute or a numeric constant for the cylinder's center longitude coordinate. |
| <b>pointColor</b> | <i>string</i> or <i>func</i> | `() => '#ffffaa'` | Point object accessor function or attribute for the cylinder color. |
| <b>pointAltitude</b> | <i>number</i>, <i>string</i> or <i>func</i> | 0.1 | Point object accessor function, attribute or a numeric constant for the cylinder's altitude in terms of globe radius units (`0` = 0 altitude (flat circle), `1` = globe radius). |
| <b>pointRadius</b> | <i>number</i>, <i>string</i> or <i>func</i> | 0.25 | Point object accessor function, attribute or a numeric constant for the cylinder's radius, in angular degrees. |
| <b>pointResolution</b> | <i>number</i> | 12 | Radial geometric resolution of each cylinder, expressed in how many slice segments to divide the circumference. Higher values yield smoother cylinders. |
| <b>pointsMerge</b> | <i>bool</i> | `false` | Whether to merge all the point meshes into a single ThreeJS object, for improved rendering performance. Visually both options are equivalent, setting this option only affects the internal organization of the ThreeJS objects. |
| <b>pointsTransitionDuration</b> | <i>number</i> | 1000 | Duration (ms) of the transition to animate point changes involving geometry modifications. A value of `0` will move the objects immediately to their final position. New objects are animated by scaling them from the ground up. Only works if `pointsMerge` is disabled. |
| <b>onPointClick</b> | <i>func</i>| *-* | Callback function for point (left-button) clicks. The point object, the event object and the clicked coordinates are included as arguments: `onPointClick(point, event, { lat, lng, altitude })`. Only works if `pointsMerge` is disabled. |
| <b>onPointRightClick</b> | <i>func</i>| *-* | Callback function for point right-clicks. The point object, the event object and the clicked coordinates are included as arguments: `onPointRightClick(point, event, { lat, lng, altitude })`. Only works if `pointsMerge` is disabled. |
| <b>onPointHover</b> | <i>func</i>| *-* | Callback function for point mouse over events. The point object (or `null` if there's no point under the mouse line of sight) is included as the first argument, and the previous point object (or `null`) as second argument: `onPointHover(point, prevPoint)`. Only works if `pointsMerge` is disabled. |

### Arcs Layer

<p align="center">
   <a href="//vasturiano.github.io/react-globe.gl/example/random-arcs/"><img width="70%" src="https://vasturiano.github.io/react-globe.gl/example/random-arcs/preview.png"></a>
</p>

| Prop | Type | Default | Description |
| --- | :--: | :--: | --- |
| <b>arcsData</b> | <i>array</i> | `[]` | List of links to represent in the arcs map layer. Each link is displayed as an arc line that rises from the surface of the globe, connecting the start and end coordinates. |
| <b>arcLabel</b> | <i>string</i> or <i>func</i> | `name` | Arc object accessor function or attribute for label (shown as tooltip). Supports plain text or HTML content. |
| <b>arcStartLat</b> | <i>number</i>, <i>string</i> or <i>func</i> | `startLat` | Arc object accessor function, attribute or a numeric constant for the line's start latitude coordinate. |
| <b>arcStartLng</b> | <i>number</i>, <i>string</i> or <i>func</i> | `startLng` | Arc object accessor function, attribute or a numeric constant for the line's start longitude coordinate. |
| <b>arcStartAltitude</b> | <i>number</i>, <i>string</i> or <i>func</i> | 0 | Arc object accessor function, attribute or a numeric constant for the line's start altitude. |
| <b>arcEndLat</b> | <i>number</i>, <i>string</i> or <i>func</i> | `endLat` | Arc object accessor function, attribute or a numeric constant for the line's end latitude coordinate. |
| <b>arcEndLng</b> | <i>number</i>, <i>string</i> or <i>func</i> | `endLng` | Arc object accessor function, attribute or a numeric constant for the line's end longitude coordinate. |
| <b>arcEndAltitude</b> | <i>number</i>, <i>string</i> or <i>func</i> | 0 | Arc object accessor function, attribute or a numeric constant for the line's end altitude. |
| <b>arcColor</b> | <i>string</i>, <i>[string, ...]</i> or <i>func</i> | `() => '#ffffaa'` | Arc object accessor function or attribute for the line's color. Also supports color gradients by passing an array of colors, or a color interpolator function. |
| <b>arcAltitude</b> | <i>number</i>, <i>string</i> or <i>func</i>| `null` |Arc object accessor function, attribute or a numeric constant for the arc's maximum altitude (ocurring at the half-way distance between the two points) in terms of globe radius units (`0` = 0 altitude (ground line), `1` = globe radius). If a value of `null` or `undefined` is used, the altitude is automatically set proportionally to the distance between the two points, according to the scale set in `arcAltitudeAutoScale`. |
| <b>arcAltitudeAutoScale</b> | <i>number</i>, <i>string</i> or <i>func</i> | 0.5 | Arc object accessor function, attribute or a numeric constant for the scale of the arc's automatic altitude, in terms of units of the great-arc distance between the two points. A value of `1` indicates the arc should be as high as its length on the ground. Only applicable if `arcAltitude` is not set. |
| <b>arcStroke</b> | <i>number</i>, <i>string</i> or <i>func</i>| `null` | Arc object accessor function, attribute or a numeric constant for the line's diameter, in angular degrees. A value of `null` or `undefined` will render a [ThreeJS Line](https://threejs.org/docs/#api/objects/Line) whose width is constant (`1px`) regardless of the camera distance. Otherwise, a [TubeGeometry](https://threejs.org/docs/#api/en/geometries/TubeGeometry) is used. |
| <b>arcCurveResolution</b> | <i>number</i> | 64 | Arc's curve resolution, expressed in how many straight line segments to divide the curve by. Higher values yield smoother curves. |
| <b>arcCircularResolution</b> | <i>number</i> | 6 | Radial geometric resolution of each line, expressed in how many slice segments to divide the tube's circumference. Only applicable when using Tube geometries (defined `arcStroke`). |
| <b>arcDashLength</b> | <i>number</i>, <i>string</i> or <i>func</i> | 1 | Arc object accessor function, attribute or a numeric constant for the length of the dashed segments in the arc, in terms of relative length of the whole line (`1` = full line length). |
| <b>arcDashGap</b> | <i>number</i>, <i>string</i> or <i>func</i> | 0 | Arc object accessor function, attribute or a numeric constant for the length of the gap between dash segments, in terms of relative line length. |
| <b>arcDashInitialGap</b> | <i>number</i>, <i>string</i> or <i>func</i> | 0 | Arc object accessor function, attribute or a numeric constant for the length of the initial gap before the first dash segment, in terms of relative line length. |
| <b>arcDashAnimateTime</b> | <i>number</i>, <i>string</i> or <i>func</i> | 0 | Arc object accessor function, attribute or a numeric constant for the time duration (in `ms`) to animate the motion of dash positions from the start to the end point for a full line length. A value of `0` disables the animation. |
| <b>arcsTransitionDuration</b> | <i>number</i> | 1000 | Duration (ms) of the transition to animate arc changes involving geometry modifications. A value of `0` will move the arcs immediately to their final position. New arcs are animated by rising them from the ground up. |
| <b>onArcClick</b> | <i>func</i>| *-* | Callback function for arc (left-button) clicks. The arc object, the event object and the clicked coordinates are included as arguments: `onArcClick(arc, event, { lat, lng, altitude })`. |
| <b>onArcRightClick</b> | <i>func</i>| *-* | Callback function for arc right-clicks. The arc object, the event object and the clicked coordinates are included as arguments: `onArcRightClick(arc, event, { lat, lng, altitude })`. |
| <b>onArcHover</b> | <i>func</i>| *-* | Callback function for arc mouse over events. The arc object (or `null` if there's no arc under the mouse line of sight) is included as the first argument, and the previous arc object (or `null`) as second argument: `onArcHover(arc, prevArc)`. |

### Polygons Layer

<p align="center">
   <a href="//vasturiano.github.io/react-globe.gl/example/choropleth-countries/"><img width="70%" src="https://vasturiano.github.io/react-globe.gl/example/choropleth-countries/preview.png"></a>
</p>

| Prop | Type | Default | Description |
| --- | :--: | :--: | --- |
| <b>polygonsData</b> | <i>array</i> | `[]` | List of polygon shapes to represent in the polygons map layer. Each polygon is displayed as a shaped cone that extrudes from the surface of the globe. |
| <b>polygonLabel</b> | <i>string</i> or <i>func</i> | `name` | Polygon object accessor function or attribute for label (shown as tooltip). Supports plain text or HTML content. |
| <b>polygonGeoJsonGeometry</b> | <i>string</i> or <i>func</i> | `geometry` | Polygon object accessor function or attribute for the GeoJson geometry specification of the polygon's shape. The returned value should have a minimum of two fields: `type` and `coordinates`. Only GeoJson geometries of type `Polygon` or `MultiPolygon` are supported, other types will be skipped. |
| <b>polygonCapColor</b> | <i>string</i> or <i>func</i> | `() => '#ffffaa'` | Polygon object accessor function or attribute for the color of the top surface. |
| <b>polygonCapMaterial</b> | <i>Material</i>, <i>string</i> or <i>func</i> | *-* | Polygon object accessor function, attribute or material object for the [ThreeJS material](https://threejs.org/docs/#api/en/materials/Material) to use in the top surface. This prop takes precedence over `polygonCapColor`, which will be ignored if both are defined. |
| <b>polygonSideColor</b> | <i>string</i> or <i>func</i> | `() => '#ffffaa'` | Polygon object accessor function or attribute for the color of the cone sides. |
| <b>polygonSideMaterial</b> | <i>Material</i>, <i>string</i> or <i>func</i> | *-* | Polygon object accessor function, attribute or material object for the [ThreeJS material](https://threejs.org/docs/#api/en/materials/Material) to use in the cone sides. This prop takes precedence over `polygonSideColor`, which will be ignored if both are defined. |
| <b>polygonStrokeColor</b> | <i>string</i> or <i>func</i> | *-* | Polygon object accessor function or attribute for the color to stroke the polygon perimeter. A falsy value will disable the stroking. |
| <b>polygonAltitude</b> | <i>number</i>, <i>string</i> or <i>func</i> | 0.01 | Polygon object accessor function, attribute or a numeric constant for the polygon cone's altitude in terms of globe radius units (`0` = 0 altitude (flat polygon), `1` = globe radius). |
| <b>polygonCapCurvatureResolution</b> | <i>number</i>, <i>string</i> or <i>func</i> | 5 | Polygon object accessor function, attribute or a numeric constant for the resolution (in angular degrees) of the cap surface curvature. The finer the resolution, the more the polygon is fragmented into smaller faces to approximate the spheric surface, at the cost of performance. |
| <b>polygonsTransitionDuration</b> | <i>number</i> | 1000 | Duration (ms) of the transition to animate polygon altitude changes. A value of `0` will size the cone immediately to their final altitude. New polygons are animated by rising them from the ground up. |
| <b>onPolygonClick</b> | <i>func</i> | *-* | Callback function for polygon (left-button) clicks. The polygon object, the event object and the clicked coordinates are included as arguments: `onPolygonClick(polygon, event, { lat, lng, altitude })`. |
| <b>onPolygonRightClick</b> | <i>func</i> | *-* | Callback function for polygon right-clicks. The polygon object, the event object and the clicked coordinates are included as arguments: `onPolygonRightClick(polygon, event, { lat, lng, altitude })`. |
| <b>onPolygonHover</b> | <i>func</i> | *-* | Callback function for polygon mouse over events. The polygon object (or `null` if there's no polygon under the mouse line of sight) is included as the first argument, and the previous polygon object (or `null`) as second argument: `onPolygonHover(polygon, prevPolygon)`. |

### Hexed Polygons Layer

<p align="center">
   <a href="//vasturiano.github.io/react-globe.gl/example/hexed-polygons/"><img width="70%" src="https://vasturiano.github.io/react-globe.gl/example/hexed-polygons/preview.png"></a>
</p>

| Prop | Type | Default | Description |
| --- | :--: | :--: | --- |
| <b>hexPolygonsData</b> | <i>array</i> | `[]` | List of polygon shapes to represent in the hexed polygons map layer. Each polygon is displayed as a tesselated group of hexagons that approximate the polygons shape according to the resolution specified in `hexPolygonResolution`. |
| <b>hexPolygonLabel</b> | <i>string</i> or <i>func</i> | `name` | Hexed polygon object accessor function or attribute for label (shown as tooltip). Supports plain text or HTML content. |
| <b>hexPolygonGeoJsonGeometry</b> | <i>string</i> or <i>func</i> | `geometry` | Hexed polygon object accessor function or attribute for the GeoJson geometry specification of the polygon's shape. The returned value should have a minimum of two fields: `type` and `coordinates`. Only GeoJson geometries of type `Polygon` or `MultiPolygon` are supported, other types will be skipped. |
| <b>hexPolygonColor</b> | <i>string</i> or <i>func</i> | `() => '#ffffaa'` | Hexed polygon object accessor function or attribute for the color of each hexagon in the polygon. |
| <b>hexPolygonAltitude</b> | <i>number</i>, <i>string</i> or <i>func</i> | 0.001 | Hexed polygon object accessor function, attribute or a numeric constant for the polygon's hexagons altitude in terms of globe radius units (`0` = 0 altitude, `1` = globe radius). |
| <b>hexPolygonResolution</b> | <i>number</i>, <i>string</i> or <i>func</i> | 3 | Hexed polygon object accessor function, attribute or a numeric constant for the geographic binning resolution as defined by [H3](https://uber.github.io/h3/#/documentation/core-library/resolution-table). Determines the area of the hexagons that tesselate the globe's surface. Accepts values between `0` and `15`. Level 0 partitions the earth in 122 (mostly) hexagonal cells. Each subsequent level sub-divides the previous in roughly 7 hexagons. |
| <b>hexPolygonMargin</b> | <i>number</i>, <i>string</i> or <i>func</i> | 0.2 | Hexed polygon object accessor function, attribute or a numeric constant for the radial margin of each hexagon. Margins above `0` will create gaps between adjacent hexagons within a polygon. The margin is specified in terms of fraction of the hexagon's surface diameter. Values below `0` or above `1` are disadvised. |
| <b>hexPolygonUseDots</b> | <i>bool</i>, <i>string</i> or <i>func</i> | `false` | Hexed polygon object accessor function, attribute or a boolean constant for whether to represent each polygon point as a circular dot instead of an hexagon. |
| <b>hexPolygonCurvatureResolution</b> | <i>number</i>, <i>string</i> or <i>func</i> | 5 | Hexed polygon object accessor function, attribute or a numeric constant for the resolution (in angular degrees) of each hexed polygon surface curvature. The finer the resolution, the more the polygon hexes are fragmented into smaller faces to approximate the spheric surface, at the cost of performance. |
| <b>hexPolygonDotResolution</b> | <i>number</i>, <i>string</i> or <i>func</i> | 12 | Hexed polygon object accessor function, attribute or a numeric constant for the resolution of each circular dot, expressed in how many slice segments to divide the circumference. Higher values yield smoother circles, at the cost of performance. This is only applicable in dot representation mode. |
| <b>hexPolygonsTransitionDuration</b> | <i>number</i> | 0 | Duration (ms) of the transition to animate hexed polygons altitude and margin changes. A value of `0` will move the hexagons immediately to their final state. New hexed polygons are animated by sizing each hexagon from `0` radius. |
| <b>onHexPolygonClick</b> | <i>func</i> | *-* | Callback function for hexed polygon (left-button) clicks. The polygon object, the event object and the clicked coordinates are included as arguments: `onHexPolygonClick(polygon, event, { lat, lng, altitude })`. |
| <b>onHexPolygonRightClick</b> | <i>func</i> | *-* | Callback function for hexed polygon right-clicks. The polygon object, the event object and the clicked coordinates are included as arguments: `onHexPolygonRightClick(polygon, event, { lat, lng, altitude })`. |
| <b>onHexPolygonHover</b> | <i>func</i> | *-* | Callback function for hexed polygon mouse over events. The polygon object (or `null` if there's no polygon under the mouse line of sight) is included as the first argument, and the previous polygon object (or `null`) as second argument: `onHexPolygonHover(polygon, prevPolygon)`. |


### Particles Layer

<p align="center">
   <a href="//vasturiano.github.io/react-globe.gl/example/satellites/"><img width="70%" src="https://vasturiano.github.io/react-globe.gl/example/satellites/preview.png"></a>
</p>

| Prop | Type | Default | Description |
| --- | :--: | :--: | --- |
| <b>particlesData</b> | <i>array</i> | `[]` | List of particle sets to represent in the particles map layer. Each particle set is displayed as a group of [Points](https://threejs.org/docs/#api/en/objects/Points). Each point in the group is a geometry vertex and can be individually positioned anywhere relative to the globe. |
| <b>particlesList</b> | <i>string</i> or <i>func</i> | `d => d` | Particle set accessor function or attribute for the list of particles in the set. By default, the data structure is expected to be an array of arrays of individual particle objects. |
| <b>particleLabel</b> | <i>string</i> or <i>func</i> | `name` | Particle object accessor function or attribute for label (shown as tooltip). Supports plain text or HTML content. |
| <b>particleLat</b> | <i>number</i>, <i>string</i> or <i>func</i> | `lat` | Particle object accessor function, attribute or a numeric constant for the latitude coordinate. |
| <b>particleLng</b> | <i>number</i>, <i>string</i> or <i>func</i> | `lng` | Particle object accessor function, attribute or a numeric constant for the longitude coordinate. |
| <b>particleAltitude</b> | <i>number</i>, <i>string</i> or <i>func</i> | 0.01 | Particle object accessor function, attribute or a numeric constant for the altitude in terms of globe radius units. |
| <b>particlesSize</b> | <i>number</i>, <i>string</i> or <i>func</i> | 0.5 | Particle set accessor function, attribute or a numeric constant for the size of all the particles in the group. |
| <b>particlesSizeAttenuation</b> | <i>bool</i>, <i>string</i> or <i>func</i> | `true` | Particle set accessor function, attribute or a boolean constant for whether the size of each particle on the screen should be attenuated according to the distance to the camera. |
| <b>particlesColor</b> | <i>string</i> or <i>func</i> | `white` | Particle set accessor function or attribute for the color of all the particles in the group. This setting will be ignored if `particlesTexture` is defined. |
| <b>particlesTexture</b> | <i>string</i> or <i>func</i> | - | Particle set accessor function or attribute for the [Texture](https://threejs.org/docs/#api/en/textures/Texture) to be applied to all the particles in the group. |
| <b>onParticleClick</b> | <i>func</i> | - | Callback function for particle (left-button) clicks. The particle object, the event object and the clicked coordinates are included as arguments: `onParticleClick(particle, event, { lat, lng, altitude })`. |
| <b>onParticleRightClick</b> | <i>func</i> | - | Callback function for particle right-clicks. The particle object, the event object and the clicked coordinates are included as arguments: `onParticleRightClick(particle, event, { lat, lng, altitude })`. |
| <b>onParticleHover</b> | <i>func</i> | - | Callback function for particle mouse over events. The particle object (or `null` if there's no particle under the mouse line of sight) is included as the first argument, and the previous particle object (or `null`) as second argument: `onParticleHover(particle, prevParticle)`. |

### Rings Layer

<p align="center">
   <a href="//vasturiano.github.io/react-globe.gl/example/random-rings/"><img width="70%" src="https://vasturiano.github.io/react-globe.gl/example/random-rings/preview.png"></a>
</p>

| Prop | Type | Default | Description |
| --- | :--: | :--: | --- |
| <b>ringsData</b> | <i>array</i> | `[]` | List of self-propagating ripple rings to represent in the rings map layer. Each data point is displayed as an animated set of concentric circles that propagate outwards from (or inwards to) a central point through the spherical surface. |
| <b>ringLat</b> | <i>number</i>, <i>string</i> or <i>func</i> | `lat` | Ring object accessor function, attribute or a numeric constant for each circle's center latitude coordinate. |
| <b>ringLng</b> | <i>number</i>, <i>string</i> or <i>func</i> | `lng` | Ring object accessor function, attribute or a numeric constant for each circle's center longitude coordinate. |
| <b>ringAltitude</b> | <i>number</i>, <i>string</i> or <i>func</i> | 0.0015 | Ring object accessor function, attribute or a numeric constant for the circle's altitude in terms of globe radius units. |
| <b>ringColor</b> | <i>string</i>, <i>[string, ...]</i> or <i>func</i> | `() => '#ffffaa'` | Ring object accessor function or attribute for the stroke color of each ring. Also supports radial color gradients by passing an array of colors, or a color interpolator function. |
| <b>ringResolution</b> | <i>number</i> | 64 | Geometric resolution of each circle, expressed in how many slice segments to divide the circumference. Higher values yield smoother circles. |
| <b>ringMaxRadius</b> | <i>number</i>, <i>string</i> or <i>func</i> | 2 | Ring object accessor function, attribute or a numeric constant for the maximum outer radius of the circles, at which the rings stop propagating and are removed. Defined in angular degrees. |
| <b>ringPropagationSpeed</b> | <i>number</i>, <i>string</i> or <i>func</i> | 1 | Ring object accessor function, attribute or a numeric constant for the propagation velocity of the rings, defined in degrees/second. Setting a negative value will invert the direction and cause the rings to propagate inwards from the `maxRadius`. |
| <b>ringRepeatPeriod</b> | <i>number</i>, <i>string</i> or <i>func</i> | 700 | Ring object accessor function, attribute or a numeric constant for the interval of time (in ms) to wait between consecutive auto-generated concentric circles. A value less or equal than `0` will disable the repetition and emit a single ring. |


### HTML Elements Layer

<p align="center">
   <a href="//vasturiano.github.io/react-globe.gl/example/html-markers/"><img width="70%" src="https://vasturiano.github.io/react-globe.gl/example/html-markers/preview.png"></a>
</p>

| Prop | Type | Default | Description |
| --- | :--: | :--: | --- |
| <b>htmlElementsData</b> | <i>array</i> | `[]` | List objects to represent in the HTML elements map layer. Each HTML element is rendered using [ThreeJS CSS2DRenderer](https://threejs.org/docs/#examples/en/renderers/CSS2DRenderer). |
| <b>htmlLat</b> | <i>number</i>, <i>string</i> or <i>func</i> | `lat` | HTML element accessor function, attribute or a numeric constant for the latitude coordinate of the element's central position. |
| <b>htmlLng</b> | <i>number</i>, <i>string</i> or <i>func</i> | `lng` | HTML element accessor function, attribute or a numeric constant for the longitude coordinate of the element's central position. |
| <b>htmlAltitude</b> | <i>number</i>, <i>string</i> or <i>func</i> | 0 | HTML element accessor function, attribute or a numeric constant for the altitude coordinate of the element's position, in terms of globe radius units. |
| <b>htmlElement</b> | <i>string</i> or <i>func</i> | `null` | Accessor function or attribute to retrieve the DOM element to use. Should return an instance of [HTMLElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement). |
| <b>htmlElementVisibilityModifier</b> | <i>func(elem, isVisible)</i> | - | Custom function that defines how elements are shown/hidden according to whether they are in front or behind the globe. The function receives two arguments `(elem, isVisible)`, the HTML element and a boolean indicating if the element should be visible. By default the Three object itself is automatically hidden when behind the globe. |
| <b>htmlTransitionDuration</b> | <i>number</i> | 1000 | Duration (ms) of the transition to animate HTML elements position changes. A value of `0` will move the elements immediately to their final position. |

### 3D Objects Layer

| Prop | Type | Default | Description |
| --- | :--: | :--: | --- |
| <b>objectsData</b> | <i>array</i> | `[]` | Getter/setter for the list of custom 3D objects to represent in the objects layer. Each object is rendered according to the `objectThreeObject` method. |
| <b>objectLabel</b> | <i>string</i> or <i>func</i> | `name` | Object accessor function or attribute for its own tooltip label. Supports plain text or HTML content. |
| <b>objectLat</b> | <i>number</i>, <i>string</i> or <i>func</i> | `lat` | Object accessor function, attribute or a numeric constant for the latitude coordinate of the object's position. |
| <b>objectLng</b> | <i>number</i>, <i>string</i> or <i>func</i> | `lng` | Object accessor function, attribute or a numeric constant for the longitude coordinate of the object's position. |
| <b>objectAltitude</b> | <i>number</i>, <i>string</i> or <i>func</i> | 0.01 | Object accessor function, attribute or a numeric constant for the altitude coordinate of the object's position, in terms of globe radius units. |
| <b>objectRotation</b> | <i>{[x], [y], [z]}</i>, <i>string</i> or <i>func</i> | | Object accessor function, attribute or a `{x, y, z}` object for the object's rotation (in degrees). Each dimension is optional, allowing for rotation only in some axes. Rotation is applied in the order **X**->**Y**->**Z**. |
| <b>objectFacesSurface</b> | <i>bool</i>, <i>string</i> or <i>func</i> | `true` | Object accessor function, attribute or a boolean constant for whether the object should be rotated to face (away from) the globe surface (`true`), or be left in its original universe orientation (`false`). |
| <b>objectThreeObject</b> | <i>Object3d</i>, <i>string</i> or <i>func</i> | *A yellow sphere* | Object accessor function or attribute for defining a custom 3d object to render as part of the objects map layer. Should return an instance of [ThreeJS Object3d](https://threejs.org/docs/index.html#api/core/Object3D). |
| <b>onObjectClick</b> | <i>func</i> | *-* | Callback function for object (left-button) clicks. The object itself, the event and the clicked coordinates are included as arguments: `onObjectClick(obj, event, { lat, lng, altitude })`. |
| <b>onObjectRightClick</b> | <i>func</i> | *-* | Callback function for object right-clicks. The object itself, the event and the clicked coordinates are included as arguments: `onObjectRightClick(obj, event, { lat, lng, altitude })`. |
| <b>onObjectHover</b> | <i>func</i> | *-* | Callback function for object mouse over events. The object itself (or `null` if there's no object under the mouse line of sight) is included as the first argument, and the previous object (or `null`) as second argument: `onObjectHover(obj, prevObj)`. |


### Render Control

| Prop | Type | Default | Description |
| --- | :--: | :--: | --- |
| <b>rendererConfig</b> | <i>object</i> | `{ antialias: true, alpha: true }` | Configuration parameters to pass to the [ThreeJS WebGLRenderer](https://threejs.org/docs/#api/en/renderers/WebGLRenderer) constructor. This prop only has an effect on component mount. |
| <b>enablePointerInteraction</b> | <i>bool</i> | `true` | Whether to enable the mouse tracking events. This activates an internal tracker of the canvas mouse position and enables the functionality of object hover/click and tooltip labels, at the cost of performance. If you're looking for maximum gain in your globe performance it's recommended to switch off this property. |
| <b>pointerEventsFilter</b> | <i>func</i> | `() => true` | Filter function which defines whether a particular object can be the target of pointer interactions. In general, objects that are closer to the camera get precedence in capturing pointer events. This function allows having ignored object layers so that pointer events can be passed through to deeper objects in the various globe layers. The ThreeJS object and its associated data (if any) are passed as arguments: `pointerEventsFilter(obj, data)`. The function should return a boolean value. |
| <b>lineHoverPrecision</b> | <i>number</i> | 0.2 | Precision to use when detecting hover events over [Line](https://threejs.org/docs/#api/objects/Line) and [Points](https://threejs.org/docs/#api/objects/Points) objects, such as arcs, paths or particles. |
| <b>showPointerCursor</b> | <i>bool</i> or <i>func</i> | `true` | Whether to show a pointer cursor when hovering over clickable portions of the globe. Accepts either a `boolean` constant or a callback function which receives the object (type and data) currently under the cursor and is expected to return a `boolean` value. |

| Method | Arguments | Description |
| --- | :--: | --- |
| <b>pointOfView</b> | { <i>lat</i>, <i>lng</i>, <i>altitude</i> } [,<i>ms</i>=`0`] | By default the camera will aim at the cross between the equator and the prime meridian (`0,0` coordinates), at an altitude of `2.5` globe radii. | Camera position, in terms of geographical `lat`, `lng`, `altitude` coordinates. Each of the coordinates is optional, allowing for motion in just some direction. The 2nd optional argument defines the duration of the transition (in ms) to animate the camera motion. A value of 0 (default) moves the camera immediately to the final position. |
| <b>pauseAnimation</b>| *-* |Pauses the rendering cycle of the component, effectively freezing the current view and cancelling all user interaction. This method can be used to save performance in circumstances when a static image is sufficient. |
| <b>resumeAnimation</b>| *-* |Resumes the rendering cycle of the component, and re-enables the user interaction. This method can be used together with `pauseAnimation` for performance optimization purposes. |
| <b>onZoom</b> | <i>func</i> | Callback function for point-of-view changes by zooming or rotating the globe using the orbit controls. The current point of view (with the syntax `{ lat, lng, altitude }`) is included as sole argument. |
| <b>lights</b> | <i>array</i> | Getter/setter for the list of lights to use in the scene. Each item should be an instance of [Light](https://threejs.org/docs/#api/en/lights/Light). |
| <b>scene</b>| *-* |Access the internal ThreeJS [Scene](https://threejs.org/docs/#api/scenes/Scene). Can be used to extend the current scene with additional objects not related to globe.gl. |
| <b>camera</b>| *-* |Access the internal ThreeJS [Camera](https://threejs.org/docs/#api/cameras/PerspectiveCamera). |
| <b>renderer</b>| *-* |Access the internal ThreeJS [WebGL renderer](https://threejs.org/docs/#api/renderers/WebGLRenderer). |
| <b>postProcessingComposer</b> | *-* | Access the [post-processing composer](https://threejs.org/docs/#examples/en/postprocessing/EffectComposer). Use this to add post-processing [rendering effects](https://github.com/mrdoob/three.js/tree/dev/examples/jsm/postprocessing) to the scene. By default the composer has a single pass ([RenderPass](https://github.com/mrdoob/three.js/blob/dev/examples/jsm/postprocessing/RenderPass.js)) that directly renders the scene without any effects. |
| <b>controls</b>| *-* |Access the internal ThreeJS [orbit controls object](https://threejs.org/docs/#examples/controls/OrbitControls). |

### Utility

| Method | Arguments | Description |
| --- | :--: | --- |
| <b>getGlobeRadius</b> | *-* | Returns the cartesian distance of a globe radius in absolute spatial units. |
| <b>getCoords</b> | <i>lat</i>, <i>lng</i> [,<i>altitude</i>=`0`] | Utility method to translate spherical coordinates to cartesian. Given a pair of latitude/longitude coordinates and optionally altitude (in terms of globe radius units), returns the equivalent `{x, y, z}` cartesian spatial coordinates. |
| <b>getScreenCoords</b> | <i>lat</i>, <i>lng</i> [,<i>altitude</i>=`0`] | Utility method to translate spherical coordinates to the viewport domain. Given a pair of latitude/longitude coordinates and optionally altitude (in terms of globe radius units), returns the current equivalent `{x, y}` in viewport coordinates. |
| <b>toGeoCoords</b> | { <i>x</i>, <i>y</i>, <i>z</i> } | Utility method to translate cartesian coordinates to the geographic domain. Given a set of 3D cartesian coordinates `{x, y, z}`, returns the equivalent `{lat, lng, altitude}` spherical coordinates. Altitude is defined in terms of globe radius units. |
| <b>toGlobeCoords</b> | <i>x</i>, <i>y</i> | Utility method to translate viewport coordinates to the globe surface coordinates directly under the specified viewport pixel. Returns the globe coordinates in the format `{ lat, lng }`, or `null` if the globe does not currently intersect with that viewport location. |


[npm-img]: https://img.shields.io/npm/v/react-globe.gl
[npm-url]: https://npmjs.org/package/react-globe.gl
[build-size-img]: https://img.shields.io/bundlephobia/minzip/react-globe.gl
[build-size-url]: https://bundlephobia.com/result?p=react-globe.gl
[npm-downloads-img]: https://img.shields.io/npm/dt/react-globe.gl
[npm-downloads-url]: https://www.npmtrends.com/react-globe.gl

## Project notes

- Wheel zoom is disabled: controls().enableZoom = false
- Auto-rotate through controls().autoRotate, paused on pointer interaction
- Create with antialiasing off and a transparent background
- Cap pixel ratio at 2
- Points are HTML elements (htmlElementsData), not 3D cylinders


