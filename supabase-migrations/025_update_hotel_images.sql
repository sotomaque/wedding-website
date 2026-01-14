-- Migration: Update hotel image URLs
-- This migration adds image URLs to the existing hotel records

UPDATE hotels
SET image_url = 'https://assets.hyatt.com/content/dam/hyatt/hyattdam/images/2021/09/29/1342/SANRS-P0629-Exterior-Nighttime.jpg/SANRS-P0629-Exterior-Nighttime.16x9.jpg'
WHERE name = 'Manchester Grand Hyatt';

UPDATE hotels
SET image_url = 'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/28/61/c4/cb/hotel-exterior.jpg?w=900&h=500&s=1'
WHERE name = 'Embassy Suites by Hilton';

UPDATE hotels
SET image_url = 'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/2e/62/e3/65/exterior-skyline.jpg?w=900&h=500&s=1'
WHERE name = 'Courtyard San Diego Gaslamp/Convention Center';

UPDATE hotels
SET image_url = 'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/30/dd/c3/2b/exterior.jpg?w=900&h=500&s=1'
WHERE name = 'Marriott Marquis San Diego Marina';

UPDATE hotels
SET image_url = 'https://image-tc.galaxy.tf/wijpeg-n6h7s4nm0elqjchncwfqe8b/revised-with-sign-scaled.jpg?width=1920'
WHERE name = 'Le Pensione Hotel';

UPDATE hotels
SET image_url = 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/374720320.jpg?k=df180dc460b56c1f43b0292e22945d2392d11983f60ce5a3285e69e6b3955f7d&o='
WHERE name = 'Omni San Diego Hotel';

UPDATE hotels
SET image_url = 'https://image-tc.galaxy.tf/wijpeg-afkqgo2v0spdfium6zswxlhxc/horton-grand-hotel-corner.jpg'
WHERE name = 'Horton Grand Hotel';

UPDATE hotels
SET image_url = 'https://media-cdn.tripadvisor.com/media/photo-s/31/f8/8c/c1/exterior.jpg'
WHERE name = 'Hilton San Diego Bayfront';
