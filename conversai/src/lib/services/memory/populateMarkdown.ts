import { MarkdownLibraryService } from './markdownLibraryClient'

export async function populateClemensData() {
  const markdownService = new MarkdownLibraryService()
  await markdownService.initialize()
  
  // Personal Identity
  const identityContent = `# Personal Identity

- **Name**: Clemens Hönig
- **Age**: ${new Date().getFullYear() - 1979} (born 1979)
- **Location**: Vienna, Austria
- **Occupation**: Intelligence & Marketing Operations Manager at Yorizon GmbH

## About Me

I'm Clemens Hönig, born in 1979 in Graz, Austria. I currently work as Intelligence & Marketing Operations Manager at Yorizon GmbH (since January 2025), a joint venture between Hochtief and Thomas-Krenn focusing on European cloud infrastructure.

I have over 10 years of experience in the film industry with C-Motion in Vienna, where I built Focus Puller at Work. I'm passionate about technology, especially 3D (Blender), AI, LLMs, and coding assistants.`
  
  // Background & History
  const backgroundContent = `# Background & History

## Education
- **University**: University of Graz
- **Field**: Sports Sciences
- **Focus**: Sports Marketing and Sports Management
- **High School**: Started at Akademisches Gymnasium Graz, switched to Gymnasium Kirchengasse from 4th grade
- **Elementary**: Nibelungen School, St. Leonhard, Graz

## Career Path
- **2025-present**: Intelligence & Marketing Operations Manager at Yorizon GmbH
- **2024**: Attempted to transform Focus Puller at Work community into a brand
- **Previous**: Over 10 years at C-Motion Wien in film industry
- **Founded**: Kakaduu EU - vocabulary cards for children
- **Past roles**: 
  - Technical representative for Salomon Snowboards (Eastern Austria)
  - Project work for emotion Management Graz (S-Tennis Masters, MTB World Cup)
  - Business manager at Steinhalle Lannach (6 months)
  - Work at New Sports Graz during school and university

## Technical Skills
- 3D modeling with Blender
- AI and Large Language Models (LLMs)
- Coding assistants
- Film industry technology
- Sports marketing and management`
  
  // Family & Relationships
  const relationshipsContent = `# Relationships

## Immediate Family
- **Wife**: Karin Schwarz (born April 26, 1983)
  - From Graz, studied Art Sciences
  - Met when I was around 21, married after moving to Vienna
  
- **Daughter**: Clara Hönig (born August 12, 2015)
  - Currently transitioning to Gymnasium Rahlgasse (very excited!)
  - Attended Evangelical Private School at Karlsplatz
  - Teacher: Nadine Fussek
  - Has celiac disease (gluten intolerance), diagnosed at age 6-7
  - Previously attended Kabelstube at Grashalm (5th district Vienna) from age 2
  - Evangelical kindergarten on Hamburger Straße

## Parents
- **Mother**: Doris Hoenig
  - Birthday: September 11
  - Profession: Dermatologist with own practice in Graz
  - Note: Didn't particularly enjoy self-employment

- **Father**: Manfred Hönig
  - Civil servant responsible for road and bridge construction for the City of Graz

## Sibling
- **Brother**: Julian Hönig (born September 11, 1976)
  - Education: Design at FH Graz
  - Career: Audi → Lamborghini → Over 10 years at Apple as Exterior Designer`
  
  // Preferences & Interests
  const preferencesContent = `# Preferences & Interests

## Professional Interests
- Artificial Intelligence and Machine Learning
- 3D modeling and visualization (Blender)
- Large Language Models and AI assistants
- Cloud infrastructure and technology
- Film industry technology
- Sports marketing

## Hobbies & Activities
- Intense skateboarding (youth)
- Snowboarding (competed professionally, worked for Salomon)
- Connection to youth culture
- Technology and innovation
- Family activities with Clara

## Work Philosophy
- Building communities and brands
- Innovation in technology
- Bridging sports, technology, and marketing
- Continuous learning and adaptation`
  
  // Current Projects
  const projectsContent = `# Current Projects & Goals

## Professional Focus at Yorizon
- Intelligence & Marketing Operations Management
- Working with European cloud infrastructure
- Joint venture between Hochtief & Thomas-Krenn

## Technical Development
- Advancing skills in AI and LLMs
- Exploring coding assistants
- 3D modeling with Blender
- Staying current with emerging technologies

## Family Life
- Supporting Clara's transition to Gymnasium
- Managing her celiac disease requirements
- Living in Vienna with Karin and Clara

## Past Projects
- Focus Puller at Work community (attempted brand transformation in 2024)
- Kakaduu EU - educational vocabulary cards for children
- Various film industry projects through C-Motion`
  
  // Additional context
  const contextContent = `# Additional Context

## Hometown & Roots
- Born and raised in Graz, Austria
- Grew up at Naglergasse 10, 8010 Graz
- Now living in Vienna with family

## Key Life Events
- Meeting Karin at age 21
- Moving to Vienna
- Birth of Clara in 2015
- Over 10 years in film industry
- Joining Yorizon in January 2025

## Languages
- German (native)
- English (professional)

## Important Dates
- My birth year: 1979
- Wife Karin's birthday: April 26, 1983
- Daughter Clara's birthday: August 12, 2015
- Mother's birthday: September 11
- Brother Julian's birthday: September 11, 1976`
  
  // Update all files
  await markdownService.updateFile('personal/identity', identityContent)
  await markdownService.updateFile('personal/background', backgroundContent)
  await markdownService.updateFile('personal/relationships', relationshipsContent)
  await markdownService.updateFile('personal/preferences', preferencesContent)
  await markdownService.createFile('context', 'current-projects', projectsContent)
  await markdownService.createFile('context', 'additional-context', contextContent)
  
  console.log('✅ Successfully populated Clemens Hönig\'s biographical data')
  return true
}