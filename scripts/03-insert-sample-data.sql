-- Insert sample braids data
INSERT INTO public.braids (braid_name, alt_names, region, contributor_name, image_url) VALUES
('Box Braids', 'Square Braids, Poetic Justice Braids', 'West Africa', 'Cultural Heritage Team', null),
('French Braid', 'Tresse Française, Dutch Braid', 'Europe', 'Traditional Styles Collective', null),
('Cornrows', 'Canerows, Boxer Braids', 'Africa', 'Heritage Documentation Project', null),
('Fishtail Braid', 'Herringbone Braid', 'Scandinavia', 'Nordic Traditions Archive', null),
('Fulani Braids', 'Tribal Braids, Fulani Cornrows', 'West Africa (Fulani People)', 'Fulani Cultural Center', null),
('Crown Braid', 'Halo Braid, Milkmaid Braid', 'Eastern Europe', 'Folk Traditions Institute', null)
ON CONFLICT (id) DO NOTHING;
