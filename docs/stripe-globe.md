# Stripe globe: reference notes

Source: https://stripe.com/blog/globe (open it for the visuals)

## Three layers that read as one surface
- A semi-transparent ocean sphere
- A sphere of tens of thousands of tiny land dots that twinkle
- Animated arcs travelling between locations, with pulsing discs where they land

## Technique
- Land dots are spread evenly over the sphere in a sunflower (Fibonacci) spiral
- Each dot is kept only if it falls on land (tested against a world map drawn to a canvas)
- A small shader gives each dot its own gentle twinkle
- Arcs animate along a curve from one location to another; a ring pulses at the landing point

## Performance
- Antialiasing off: barely visible, large speed gain on high-resolution screens

## For this project
- Stage A uses react-globe.gl's built-in dotted land. Stage B (optional) recreates the twinkling dot layer above. Read DESIGN.md globe section.