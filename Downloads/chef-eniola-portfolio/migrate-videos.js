#!/usr/bin/env node

/**
 * Migration Script: Migrate Local Videos to Supabase
 * 
 * This script migrates all local video references to the Supabase database.
 * Run this after setting up your database tables.
 * 
 * Usage: node migrate-videos.js
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase credentials in .env file');
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// All local videos to migrate
const videos = [
  '/gl/IMG_5069.MP4',
  '/gl/IMG_5074.MP4',
  '/gl/IMG_5075.MP4',
  '/gl/IMG_5078.MP4',
  '/gl/IMG_5085.MP4',
  '/gl/IMG_5086.MP4',
  '/gl/IMG_5088.MP4',
  '/gl/IMG_5095.MP4',
  '/gl/subs/IMG_5304.MP4',
  '/gl/subs/IMG_5306.MP4',
  '/gl/subs/IMG_5309.MP4',
  '/gl/subs/IMG_5311.MP4'
];

// All local images to migrate
const images = [
  '/gl/photo_1_2026-04-14_13-04-14.jpg',
  '/gl/photo_2_2026-04-14_13-04-14.jpg',
  '/gl/photo_3_2026-04-14_13-04-14.jpg',
  '/gl/photo_4_2026-04-14_13-04-14.jpg',
  '/gl/photo_9_2026-04-14_13-04-14.jpg',
  '/gl/photo_10_2026-04-14_13-04-14.jpg',
  '/gl/photo_11_2026-04-14_13-04-14.jpg',
  '/gl/photo_12_2026-04-14_13-04-14.jpg',
  '/gl/photo_13_2026-04-14_13-04-14.jpg',
  '/gl/photo_14_2026-04-14_13-04-15.jpg',
  '/gl/photo_15_2026-04-14_13-04-15.jpg',
  '/gl/photo_16_2026-04-14_13-04-15.jpg',
  '/gl/photo_17_2026-04-14_13-04-15.jpg',
  '/gl/photo_18_2026-04-14_13-04-15.jpg',
  '/gl/photo_19_2026-04-14_13-04-15.jpg',
  '/gl/photo_20_2026-04-14_13-04-15.jpg',
  '/gl/subs/photo_1_2026-04-27_15-59-26.jpg',
  '/gl/subs/photo_2_2026-04-27_15-59-26.jpg',
  '/gl/subs/photo_3_2026-04-27_15-59-26.jpg',
  '/gl/subs/photo_4_2026-04-27_15-59-26.jpg',
  '/gl/subs/photo_5_2026-04-27_15-59-26.jpg',
  '/gl/subs/photo_6_2026-04-27_15-59-26.jpg',
  '/gl/subs/photo_7_2026-04-27_15-59-26.jpg',
  '/gl/subs/photo_1_2026-04-27_16-06-28.jpg',
  '/gl/subs/photo_2_2026-04-27_16-06-28.jpg',
  '/gl/subs/photo_3_2026-04-27_16-06-28.jpg',
  '/gl/subs/photo_4_2026-04-27_16-06-28.jpg',
  '/gl/subs/photo_5_2026-04-27_16-06-28.jpg',
  '/gl/subs/photo_6_2026-04-27_16-06-28.jpg',
  '/gl/subs/photo_7_2026-04-27_16-06-28.jpg',
  '/gl/subs/photo_8_2026-04-27_16-06-28.jpg'
];

async function migrateVideos() {
  console.log('🎬 Migrating videos to Supabase...\n');

  // Check existing videos
  const { data: existingVideos, error: fetchError } = await supabase
    .from('kitchen_videos')
    .select('videoUrl');

  if (fetchError) {
    console.error('❌ Error fetching existing videos:', fetchError.message);
    return;
  }

  const existingUrls = new Set(existingVideos.map(v => v.videoUrl));
  const videosToInsert = videos.filter(url => !existingUrls.has(url));

  if (videosToInsert.length === 0) {
    console.log('✅ All videos already migrated!');
    return;
  }

  console.log(`📊 Found ${videosToInsert.length} videos to migrate`);

  const videoData = videosToInsert.map(url => ({
    videoUrl: url,
    createdAt: new Date().toISOString()
  }));

  const { data, error } = await supabase
    .from('kitchen_videos')
    .insert(videoData)
    .select();

  if (error) {
    console.error('❌ Error migrating videos:', error.message);
    return;
  }

  console.log(`✅ Successfully migrated ${data.length} videos!`);
  data.forEach(video => {
    console.log(`   - ${video.videoUrl}`);
  });
}

async function migrateImages() {
  console.log('\n🖼️  Migrating images to Supabase...\n');

  // Check existing images
  const { data: existingImages, error: fetchError } = await supabase
    .from('gallery')
    .select('imageUrl');

  if (fetchError) {
    console.error('❌ Error fetching existing images:', fetchError.message);
    return;
  }

  const existingUrls = new Set(existingImages.map(i => i.imageUrl));
  const imagesToInsert = images.filter(url => !existingUrls.has(url));

  if (imagesToInsert.length === 0) {
    console.log('✅ All images already migrated!');
    return;
  }

  console.log(`📊 Found ${imagesToInsert.length} images to migrate`);

  const imageData = imagesToInsert.map(url => ({
    imageUrl: url,
    createdAt: new Date().toISOString()
  }));

  const { data, error } = await supabase
    .from('gallery')
    .insert(imageData)
    .select();

  if (error) {
    console.error('❌ Error migrating images:', error.message);
    return;
  }

  console.log(`✅ Successfully migrated ${data.length} images!`);
  console.log(`   Total images in gallery: ${existingImages.length + data.length}`);
}

async function main() {
  console.log('🚀 Starting migration...\n');
  console.log('📍 Supabase URL:', supabaseUrl);
  console.log('');

  try {
    await migrateVideos();
    await migrateImages();
    
    console.log('\n✨ Migration complete!\n');
    console.log('Next steps:');
    console.log('1. Visit your admin panel to verify the migration');
    console.log('2. Check that videos and images display correctly');
    console.log('3. Start using the admin panel to manage content!\n');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
