"""Generate the LearnSpanishForAll beginner Spanish curriculum JSON files.

The generated curriculum is intentionally data-driven so the 15 subject files
can be regenerated consistently after edits.
"""
from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
CURRICULUM_DIR = ROOT / "content" / "curriculum"

SUBJECTS_META = [
    ("greetings-sounds", "Greetings & Sounds", 1, "greetings-sounds.html"),
    ("identity", "Who I Am", 2, "identity.html"),
    ("numbers-time", "Numbers, Time & Calendar", 3, "numbers-time.html"),
    ("family-people", "Family & People", 4, "family-people.html"),
    ("home-class", "Home & Class", 5, "home-class.html"),
    ("food-drink", "Food & Drink", 6, "food-drink.html"),
    ("routines-present", "Daily Routines (Present -ar)", 7, "routines-present.html"),
    ("places-ir", "Places & ir", 8, "places-ir.html"),
    ("weather-clothes", "Weather & Clothes", 9, "weather-clothes.html"),
    ("likes-hobbies", "Likes & Hobbies (gustar)", 10, "likes-hobbies.html"),
    ("shopping-needs", "Shopping & Needs", 11, "shopping-needs.html"),
    ("core-500-checkpoint", "Core 500 Checkpoint", 12, "core-500-checkpoint.html"),
    ("past-basics", "Past Basics (pretérito)", 13, "past-basics.html"),
    ("travel-out", "Travel & Going Out", 14, "travel-out.html"),
    ("plans-deeper", "Plans & Going Deeper", 15, "plans-deeper.html"),
]


def day(
    focus: str,
    cue: str,
    words: list[str],
    model: str,
    sample: str,
    sample2: str,
    scenario: str,
    listen: str,
) -> dict:
    return {
        "focus": focus,
        "cue": cue,
        "words": words,
        "model": model,
        "sample": sample,
        "sample2": sample2,
        "scenario": scenario,
        "listen": listen,
    }


DAY_DATA = {
    "greetings-sounds": [
        day("Hola / Hello", "Start with friendly greetings for any time of day.", ["hola", "buenos días", "buenas tardes", "buenas noches", "adiós", "chao"], "Hola, buenos días.", "Hola, buenos días. ¿Cómo estás?", "Buenas tardes. Estoy bien, gracias.", "meeting a neighbor or classmate", "a greeting back and words like bien or gracias"),
        day("Courtesy words", "Courtesy phrases make short Spanish sound warm and natural.", ["por favor", "gracias", "de nada", "perdón", "disculpe", "con permiso"], "Gracias. De nada.", "Perdón, ¿puedo pasar?", "Café, por favor. Gracias.", "being polite in a doorway, store, or classroom", "a polite reply such as de nada or con permiso"),
        day("Names", "Use llamarse to exchange names; me llamo means my name is.", ["me llamo", "te llamas", "se llama", "nombre", "mucho gusto", "igualmente"], "Me llamo Ana. ¿Cómo te llamas?", "Me llamo Luis. Mucho gusto.", "Ella se llama Carla. Igualmente.", "introducing yourself to one person", "a name and a response like mucho gusto"),
        day("Five vowel sounds", "Spanish vowels are steady: a, e, i, o, u do not slide.", ["a", "e", "i", "o", "u", "mamá", "mesa", "vino"], "a-e-i-o-u", "Mi mamá toma café.", "Vivo en una casa bonita.", "reading simple words aloud clearly", "whether each vowel stays short and steady"),
        day("Stress and accents", "Most words stress the next-to-last syllable unless an accent mark shows otherwise.", ["café", "teléfono", "música", "familia", "amigo", "rápido"], "café / teléfono", "El teléfono está aquí.", "Me gusta la música rápida.", "noticing accent marks while reading", "the stressed syllable and any accent mark"),
        day("Alphabet spelling", "Letter names help with names, email, and addresses.", ["a", "be", "ce", "de", "e", "efe", "ge", "hache"], "Se escribe A-N-A.", "Mi nombre se escribe L-U-I-S.", "Casa se escribe C-A-S-A.", "spelling a name or simple word", "letters repeated back in order"),
        day("Question intonation", "Spanish often marks questions with rising intonation and question marks.", ["¿cómo?", "¿qué?", "¿quién?", "¿dónde?", "sí", "no"], "¿Cómo estás?", "¿Quién es? Es mi amigo.", "¿Dónde está Ana? Está aquí.", "asking short yes/no and information questions", "a yes/no answer or a question word"),
        day("Yo, tú, usted", "Use tú with peers and usted for respectful or formal address in Latin America.", ["yo", "tú", "usted", "él", "ella", "nosotros"], "Yo soy Ana. ¿Y usted?", "Yo soy estudiante. ¿Y tú?", "Ella es mi amiga.", "choosing a respectful pronoun", "whether the person uses tú or usted"),
        day("Classroom survival", "Survival phrases keep you in Spanish when you need help.", ["no entiendo", "repita", "más despacio", "otra vez", "ayuda", "por favor"], "No entiendo. Repita, por favor.", "Más despacio, por favor.", "Necesito ayuda otra vez.", "asking a teacher or partner for help", "a slower repeat or a helpful gesture"),
        day("Mini meet-and-greet", "Combine greeting, name, courtesy, and one question.", ["hola", "me llamo", "mucho gusto", "¿cómo estás?", "bien", "gracias"], "Hola, me llamo Ana. ¿Cómo estás?", "Mucho gusto. Estoy bien, gracias.", "Hola, soy Luis. ¿Y tú?", "a 30-second first meeting", "name, feeling, and polite closing"),
    ],
    "identity": [
        day("Soy / I am", "Soy identifies you in a stable way: name, role, origin, or description.", ["soy", "no soy", "persona", "estudiante", "amigo", "amiga"], "Soy estudiante.", "Soy Ana. No soy maestra.", "Soy una persona tranquila.", "saying two facts about yourself", "identity words such as estudiante or amiga"),
        day("Ser: eres / es", "Ser changes with the person: soy, eres, es.", ["soy", "eres", "es", "alto", "bajo", "interesante"], "Tú eres amable. Ella es alta.", "Yo soy bajo y amable.", "El libro es interesante.", "describing yourself and another person", "the verb form that matches the person"),
        day("Nationalities", "Nationalities are adjectives and often change for gender.", ["mexicano", "mexicana", "colombiano", "peruana", "chileno", "estadounidense"], "Soy mexicana.", "Mi amigo es colombiano.", "Ella es estadounidense.", "saying where people are from broadly", "country or nationality words"),
        day("Languages", "Hablo names languages you speak; estudio names what you are learning.", ["hablo", "inglés", "español", "estudio", "aprendo", "idioma"], "Hablo inglés y estudio español.", "Aprendo español todos los días.", "Ella habla dos idiomas.", "explaining your language background", "language names and verbs like hablo"),
        day("Professions and roles", "Use soy with jobs and roles, usually without un/una for professions.", ["maestro", "maestra", "doctor", "doctora", "trabajador", "artista"], "Soy doctora.", "Mi hermano es maestro.", "Ella es artista.", "naming jobs in your family or community", "a role or profession"),
        day("Age with tener", "Spanish uses tener for age: tengo veinte años.", ["tengo", "tienes", "años", "joven", "mayor", "veinte"], "Tengo veinte años.", "Mi amigo tiene veintiún años.", "¿Cuántos años tienes?", "sharing or asking age politely", "a number plus años"),
        day("Origin and home", "Soy de gives origin; vivo en gives current home.", ["soy de", "vivo en", "ciudad", "país", "barrio", "cerca"], "Soy de México y vivo en Chicago.", "Vivo cerca de mi familia.", "Mi ciudad es grande.", "introducing where you are from and live", "a place name or location phrase"),
        day("Personal adjectives", "Adjectives describe people and usually match gender and number.", ["simpático", "simpática", "serio", "seria", "inteligente", "paciente"], "Soy una persona paciente.", "Mi amiga es simpática.", "Él es serio e inteligente.", "describing personality", "adjective endings and clear meaning"),
        day("Gender and number", "Many adjectives change: amigo alto, amigas altas.", ["alto", "alta", "altos", "altas", "pequeño", "grandes"], "Las amigas son altas.", "El perro es pequeño.", "Mis hermanos son grandes.", "making nouns and adjectives agree", "matching singular/plural and masculine/feminine"),
        day("Identity paragraph", "A short identity paragraph combines name, origin, language, role, and adjective.", ["me llamo", "soy", "vivo", "hablo", "tengo", "persona"], "Me llamo Ana. Soy estudiante y vivo en Lima.", "Hablo inglés y aprendo español.", "Soy una persona amable.", "writing a simple profile", "several identity facts in order"),
    ],
    "numbers-time": [
        day("Numbers 0-10", "Numbers help with age, time, prices, and addresses.", ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "diez"], "Tengo dos libros.", "Hay cinco estudiantes.", "Necesito tres minutos.", "counting small objects around you", "numbers connected to real objects"),
        day("Numbers 11-20", "Eleven to twenty are high-frequency for age, dates, and counts.", ["once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "veinte"], "Tengo quince años.", "Hay doce sillas.", "Necesito veinte pesos.", "saying ages, quantities, and small prices", "a number from eleven to twenty"),
        day("Tens to 100", "Tens combine for practical counts: treinta y uno, cuarenta y dos.", ["diez", "veinte", "treinta", "cuarenta", "cincuenta", "cien"], "Son treinta y dos dólares.", "Tengo cuarenta libros en casa.", "La clase tiene cincuenta minutos.", "counting money, minutes, or addresses", "tens and y combinations"),
        day("Phone and address numbers", "Say long numbers in small groups so listeners can confirm.", ["teléfono", "número", "calle", "casa", "apartamento", "dirección"], "Mi número es cinco-cero-dos.", "Vivo en la calle ocho.", "El apartamento es quince.", "giving contact information slowly", "digits repeated in chunks"),
        day("Days of the week", "Weekdays are lowercase in Spanish and use el for on a day.", ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"], "El lunes estudio español.", "Trabajo el viernes.", "El domingo descanso.", "talking about a weekly schedule", "a day plus an activity"),
        day("Months and dates", "Dates use el + number + de + month.", ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio"], "Hoy es el cinco de mayo.", "Mi cumpleaños es el dos de abril.", "La clase es en junio.", "saying dates and birthdays", "day number and month"),
        day("Clock time", "Use es la una for one o'clock and son las for other hours.", ["hora", "una", "dos", "media", "cuarto", "minuto"], "Son las dos y media.", "Es la una en punto.", "La clase es a las tres.", "asking or giving the time", "hour and minute words"),
        day("Parts of the day", "Use de la mañana, tarde, noche to clarify time.", ["mañana", "tarde", "noche", "mediodía", "temprano", "tarde"], "Estudio por la mañana.", "Trabajo en la tarde.", "Duermo por la noche.", "placing activities in the day", "morning, afternoon, or night"),
        day("Today, tomorrow, yesterday", "Time words anchor simple sentences before tense gets complex.", ["hoy", "mañana", "ayer", "ahora", "después", "antes"], "Hoy estudio. Mañana trabajo.", "Ahora estoy en casa.", "Después hablo con mi amiga.", "sequencing a simple day", "time markers that show order"),
        day("Mini schedule", "A schedule combines days, times, and activities.", ["clase", "trabajo", "cita", "reunión", "a las", "el"], "El martes tengo clase a las cinco.", "El viernes trabajo por la tarde.", "El sábado tengo una cita.", "writing a three-item weekly plan", "day, time, and event"),
    ],
    "family-people": [
        day("Close family", "Family words are useful early because they make personal sentences real.", ["madre", "padre", "mamá", "papá", "hijo", "hija", "hermano", "hermana"], "Mi madre se llama Rosa.", "Tengo un hermano y una hermana.", "Mi papá vive cerca.", "introducing immediate family", "family words and names"),
        day("Extended family", "Extended family adds useful people for stories and introductions.", ["abuelo", "abuela", "tío", "tía", "primo", "prima"], "Mi abuela es amable.", "Tengo dos primos en México.", "Mi tío trabaja mucho.", "describing relatives", "relationship words and simple facts"),
        day("Possessives", "Mi, tu, and su show whose person or thing you mean.", ["mi", "mis", "tu", "tus", "su", "sus"], "Mi hermana vive aquí.", "Tus padres son simpáticos.", "Su familia es grande.", "showing possession with family words", "possessive words before nouns"),
        day("Tener family", "Tener lets you say who you have in your family.", ["tengo", "tienes", "tiene", "tenemos", "familia", "pariente"], "Tengo una familia pequeña.", "Ella tiene tres hijos.", "Tenemos muchos parientes.", "counting family members", "tener plus people"),
        day("Physical descriptions", "Use ser for basic appearance descriptions.", ["alto", "bajo", "joven", "mayor", "moreno", "rubio"], "Mi hermano es alto.", "Mi abuela es mayor.", "Ella es joven y morena.", "describing what people look like", "adjectives that match the person"),
        day("Personality descriptions", "Personality adjectives help you talk beyond labels.", ["amable", "trabajador", "gracioso", "tranquilo", "feliz", "generoso"], "Mi mamá es trabajadora.", "Mi primo es gracioso.", "Soy una persona tranquila.", "describing how people are", "personality adjectives"),
        day("Age in the family", "Combine tener, numbers, and family words for useful details.", ["años", "mayor", "menor", "bebé", "niño", "niña"], "Mi hermana tiene diez años.", "Mi hermano menor es niño.", "Mi abuelo es mayor.", "comparing ages in a family", "age words and tener"),
        day("People around you", "Not every important person is family.", ["amigo", "amiga", "vecino", "vecina", "compañero", "compañera"], "Mi vecina es amable.", "Tengo un compañero nuevo.", "Mi amiga habla español.", "describing people in your daily life", "social relationship words"),
        day("Feelings with estar", "Use estar for temporary feelings: estoy cansado, está feliz.", ["estoy", "estás", "está", "cansado", "contento", "nervioso"], "Estoy contenta hoy.", "Mi papá está cansado.", "¿Estás nervioso?", "checking how someone feels", "estar forms and feeling words"),
        day("Family introduction", "A family introduction uses names, relationships, ages, and traits.", ["familia", "se llama", "tiene", "es", "vive", "conmigo"], "Mi familia es pequeña. Mi madre se llama Rosa.", "Mi hermano tiene quince años y vive conmigo.", "Mi abuela es amable.", "giving a short family presentation", "several family facts in clear order"),
    ],
    "home-class": [
        day("Rooms at home", "Room words help you describe your real environment.", ["casa", "apartamento", "cocina", "baño", "sala", "cuarto"], "Mi casa tiene una cocina.", "Estoy en la sala.", "El baño es pequeño.", "naming rooms where things happen", "room names and hay/tiene"),
        day("Furniture", "Furniture words make location practice concrete.", ["mesa", "silla", "cama", "sofá", "puerta", "ventana"], "La mesa está en la cocina.", "Mi cama es grande.", "La ventana está abierta.", "describing a room", "object plus location"),
        day("Classroom objects", "Classroom nouns support study instructions.", ["libro", "cuaderno", "lápiz", "pluma", "papel", "mochila"], "Necesito un lápiz y papel.", "El libro está en la mochila.", "Mi cuaderno es azul.", "getting ready for class", "school object names"),
        day("El, la, un, una", "Articles mark gender and help nouns sound complete.", ["el", "la", "un", "una", "los", "las"], "La silla y el libro están aquí.", "Tengo una pluma.", "Necesito un cuaderno.", "choosing articles for common nouns", "article plus noun agreement"),
        day("Hay / there is", "Hay means there is or there are; it does not change for plural.", ["hay", "no hay", "mucho", "poco", "aquí", "allí"], "Hay tres libros en la mesa.", "No hay papel aquí.", "Hay mucha comida allí.", "saying what exists in a place", "hay plus noun and location"),
        day("Location words", "Location phrases answer where something is.", ["en", "sobre", "debajo", "cerca", "lejos", "al lado"], "El lápiz está sobre la mesa.", "La mochila está debajo de la silla.", "El baño está cerca.", "finding objects in a room", "preposition and object"),
        day("Need in class", "Necesitar helps you ask for materials without long grammar.", ["necesito", "necesitas", "necesita", "usar", "prestar", "buscar"], "Necesito usar una pluma.", "¿Necesitas un libro?", "Ella busca su mochila.", "asking for or finding class materials", "necesitar plus object"),
        day("Colors with objects", "Colors usually come after nouns and often match them.", ["rojo", "azul", "verde", "negro", "blanco", "amarillo"], "Tengo un cuaderno azul.", "La mochila roja está aquí.", "Las sillas negras son grandes.", "describing objects by color", "noun-color order"),
        day("Organizing actions", "Simple -ar verbs describe what you do with things.", ["limpiar", "ordenar", "guardar", "buscar", "mirar", "usar"], "Guardo el libro en la mochila.", "Limpio la mesa.", "Busco mi lápiz.", "organizing a desk or room", "action verb plus object"),
        day("Room/class description", "Combine rooms, objects, colors, locations, and hay.", ["hay", "está", "tengo", "mesa", "silla", "cuaderno"], "Hay una mesa en mi cuarto.", "Mi cuaderno azul está sobre la mesa.", "Tengo una silla negra.", "describing your study space", "objects, colors, and locations"),
    ],
    "food-drink": [
        day("Meals", "Meal words connect Spanish to daily routines immediately.", ["desayuno", "almuerzo", "cena", "comida", "merienda", "plato"], "El desayuno es café y pan.", "Como almuerzo a las doce.", "La cena está lista.", "talking about meals today", "meal names and times"),
        day("Fruits", "Fruits are useful for preferences, shopping, and snacks.", ["manzana", "banana", "naranja", "uva", "fresa", "limón"], "Quiero una manzana.", "Como banana por la mañana.", "El limón es amarillo.", "choosing fruit at a store", "fruit names and quantity"),
        day("Vegetables", "Vegetable words build practical restaurant and home language.", ["tomate", "lechuga", "cebolla", "papa", "zanahoria", "maíz"], "Necesito tomate y cebolla.", "La sopa tiene zanahoria.", "Como papa con maíz.", "planning a simple meal", "vegetable names"),
        day("Drinks", "Drink words support ordering and hospitality.", ["agua", "café", "té", "leche", "jugo", "refresco"], "Quiero agua, por favor.", "Tomo café con leche.", "El jugo es de naranja.", "asking for a drink politely", "drink name and courtesy"),
        day("Ordering politely", "Quiero is direct; quisiera sounds softer and polite.", ["quiero", "quisiera", "para mí", "menú", "cuenta", "por favor"], "Quisiera el menú, por favor.", "Para mí, quiero agua.", "La cuenta, por favor.", "ordering in a cafe", "polite request words"),
        day("Hunger and thirst", "Spanish uses tener for hunger and thirst.", ["hambre", "sed", "tengo", "tienes", "frío", "calor"], "Tengo hambre y sed.", "¿Tienes hambre?", "Ella tiene sed.", "saying physical needs", "tener plus a need"),
        day("Prices for food", "Food buying combines numbers, money, and nouns.", ["cuesta", "pesos", "dólares", "barato", "caro", "precio"], "La manzana cuesta dos pesos.", "El café es caro.", "El precio es barato.", "asking about food prices", "cost words and numbers"),
        day("Food likes", "Me gusta introduces preferences with food.", ["me gusta", "no me gusta", "te gusta", "arroz", "pollo", "sopa"], "Me gusta el arroz con pollo.", "No me gusta la sopa fría.", "¿Te gusta el café?", "sharing food preferences", "gusta plus food"),
        day("Eat, drink, prepare", "High-frequency food verbs let you say what happens at meals.", ["comer", "beber", "tomar", "preparar", "cocinar", "probar"], "Como arroz y bebo agua.", "Preparo café por la mañana.", "Quiero probar la sopa.", "describing meal actions", "verbs with food or drinks"),
        day("Simple menu plan", "A menu plan combines meals, foods, drinks, and preferences.", ["desayuno", "almuerzo", "cena", "quiero", "me gusta", "necesito"], "Para el desayuno quiero café y pan.", "Para el almuerzo necesito arroz.", "Me gusta cenar sopa.", "writing a one-day menu", "meal plus food and drink"),
    ],
    "routines-present": [
        day("-ar verbs: yo", "Present -ar verbs often end in -o for yo.", ["hablar", "estudiar", "trabajar", "caminar", "cocinar", "limpiar"], "Yo estudio español.", "Trabajo por la mañana.", "Camino a la escuela.", "saying what you do", "yo verbs ending in -o"),
        day("-ar verbs: tú", "For tú, present -ar verbs often end in -as.", ["hablas", "estudias", "trabajas", "caminas", "cocinas", "limpias"], "¿Estudias español?", "Tú trabajas mucho.", "¿Caminas al parque?", "asking a peer about routines", "tú verbs ending in -as"),
        day("-ar verbs: él/ella/usted", "For él, ella, and usted, present -ar verbs end in -a.", ["habla", "estudia", "trabaja", "camina", "cocina", "limpia"], "Ella estudia en casa.", "Usted habla español.", "Mi padre trabaja hoy.", "describing another person's routine", "third-person verbs ending in -a"),
        day("Morning routine", "Routine language is stronger when tied to a real time of day.", ["me levanto", "desayuno", "tomo", "preparo", "salgo", "mañana"], "Me levanto y desayuno.", "Preparo café por la mañana.", "Salgo a las ocho.", "describing your morning", "time order and routine verbs"),
        day("Study and work", "Estudiar and trabajar are core daily-life verbs.", ["estudio", "trabajo", "practico", "escucho", "miro", "leo"], "Estudio español y practico palabras.", "Escucho música en español.", "Miro un video corto.", "describing learning habits", "study verbs and objects"),
        day("Home routine", "Home verbs let you narrate chores and care tasks.", ["limpio", "cocino", "lavo", "ordeno", "ayudo", "cuido"], "Limpio la cocina.", "Cocino arroz para mi familia.", "Ayudo en casa.", "talking about chores", "verbs plus home nouns"),
        day("Frequency words", "Frequency words make routines more precise.", ["siempre", "a veces", "nunca", "todos los días", "mucho", "poco"], "Siempre estudio por la noche.", "A veces camino al trabajo.", "Nunca tomo café tarde.", "saying how often you do things", "frequency word plus action"),
        day("Sequence words", "Primero and después organize routines without complex grammar.", ["primero", "después", "luego", "también", "al final", "antes"], "Primero desayuno; después estudio.", "Luego camino a la clase.", "Al final descanso.", "putting actions in order", "sequence words"),
        day("Questions about routines", "Routine questions create useful conversation quickly.", ["¿qué?", "¿cuándo?", "¿dónde?", "¿con quién?", "trabajas", "estudias"], "¿Cuándo estudias español?", "¿Dónde trabajas?", "¿Con quién caminas?", "interviewing a partner about a day", "question words and verb forms"),
        day("Daily routine paragraph", "A clear routine paragraph uses yo forms, time, frequency, and sequence.", ["me levanto", "estudio", "trabajo", "camino", "cocino", "descanso"], "Me levanto temprano y estudio español.", "Después trabajo y camino a casa.", "Por la noche cocino y descanso.", "summarizing a normal day", "ordered present-tense actions"),
    ],
    "places-ir": [
        day("Common places", "Place words prepare you to say where you are and where you go.", ["escuela", "tienda", "parque", "banco", "hospital", "iglesia"], "Voy a la tienda.", "La escuela está cerca.", "El parque es grande.", "naming places in town", "place names and location"),
        day("Ir: voy, vas, va", "Ir is irregular but very frequent: voy, vas, va.", ["voy", "vas", "va", "vamos", "van", "ir"], "Voy al parque.", "¿Vas a la escuela?", "Ella va al banco.", "saying where people go", "correct ir form"),
        day("Al and a la", "Use al before masculine places and a la before feminine places.", ["al", "a la", "a los", "a las", "mercado", "biblioteca"], "Voy al mercado.", "Vamos a la biblioteca.", "Van a las tiendas.", "choosing al or a la", "place gender and contraction"),
        day("Transportation", "Transportation phrases explain how you go.", ["camino", "en bus", "en carro", "en tren", "bicicleta", "taxi"], "Voy en bus al trabajo.", "Camino a la tienda.", "Vamos en taxi.", "describing how you travel", "transport phrase plus place"),
        day("¿Adónde vas?", "Adónde asks destination; dónde asks location.", ["¿adónde?", "¿dónde?", "aquí", "allá", "cerca", "lejos"], "¿Adónde vas? Voy al parque.", "¿Dónde estás? Estoy aquí.", "La tienda está lejos.", "asking destination and location", "difference between dónde and adónde"),
        day("Ir a for purpose", "Ir a plus an infinitive tells why you go somewhere.", ["estudiar", "comprar", "comer", "trabajar", "visitar", "descansar"], "Voy a la tienda a comprar pan.", "Vamos al parque a descansar.", "Ella va a la escuela a estudiar.", "giving a reason for going", "place plus a purpose verb"),
        day("From and to", "De and a make movement clearer.", ["de", "a", "desde", "hasta", "casa", "trabajo"], "Voy de casa al trabajo.", "Camino desde la escuela hasta el parque.", "Vengo de la tienda.", "describing a route", "start and end points"),
        day("Invitations with vamos", "Vamos can invite someone: let's go.", ["vamos", "conmigo", "contigo", "hoy", "mañana", "esta noche"], "Vamos al parque mañana.", "¿Vienes conmigo?", "Voy contigo a la tienda.", "inviting someone out", "invitation and time word"),
        day("Basic directions", "Direction words help you navigate simply.", ["derecha", "izquierda", "recto", "calle", "esquina", "frente"], "Siga recto y gire a la derecha.", "La tienda está en la esquina.", "El banco está enfrente.", "giving or following directions", "direction words"),
        day("Weekend route", "A weekend route combines places, ir, transport, and purpose.", ["sábado", "domingo", "voy", "vamos", "al", "a la"], "El sábado voy al mercado en bus.", "Después vamos al parque a caminar.", "El domingo voy a la iglesia.", "planning a weekend route", "days, places, and reasons"),
    ],
    "weather-clothes": [
        day("Basic weather", "Weather phrases often use hace for conditions.", ["hace calor", "hace frío", "hace sol", "llueve", "nieva", "viento"], "Hace calor hoy.", "Llueve en la tarde.", "Hace viento en mi ciudad.", "describing today's weather", "weather phrase and time"),
        day("Seasons", "Seasons help you talk about patterns, clothes, and plans.", ["primavera", "verano", "otoño", "invierno", "temporada", "clima"], "En verano hace calor.", "El invierno es frío.", "Me gusta la primavera.", "describing seasons where you live", "season and weather"),
        day("Clothes basics", "Clothing words connect to weather and shopping.", ["camisa", "pantalón", "vestido", "zapatos", "chaqueta", "sombrero"], "Uso una chaqueta hoy.", "Mis zapatos son negros.", "La camisa es blanca.", "describing what you wear", "clothing noun and color"),
        day("More colors", "Colors after nouns make descriptions flexible.", ["gris", "marrón", "rosado", "morado", "naranja", "claro"], "Tengo una camisa gris.", "La chaqueta morada es bonita.", "Uso zapatos marrones.", "describing clothes by color", "noun-color agreement"),
        day("Llevar / usar", "In Latin America, usar is common for wearing; llevar also works.", ["uso", "usas", "usa", "llevo", "llevas", "lleva"], "Uso una chaqueta azul.", "Ella lleva un vestido rojo.", "¿Usas sombrero?", "saying what someone is wearing", "wearing verb plus clothing"),
        day("Clothes for weather", "Choose clothes with para when explaining purpose.", ["para", "frío", "calor", "lluvia", "sol", "cómodo"], "Uso chaqueta para el frío.", "Necesito sombrero para el sol.", "Estos zapatos son cómodos.", "matching clothes to weather", "reason words like para"),
        day("Weather opinions", "Opinion phrases make weather talk conversational.", ["me gusta", "no me gusta", "prefiero", "porque", "bonito", "feo"], "Me gusta el sol porque es bonito.", "No me gusta la lluvia.", "Prefiero el clima frío.", "sharing a weather preference", "opinion plus reason"),
        day("Sizes", "Sizes are important for clothes shopping.", ["talla", "pequeña", "mediana", "grande", "corto", "largo"], "Necesito una talla mediana.", "El pantalón es largo.", "La camisa es pequeña.", "asking for size", "size adjective"),
        day("Packing clothes", "Packing verbs prepare travel and daily plans.", ["empacar", "lavar", "poner", "necesitar", "maleta", "ropa"], "Necesito empacar ropa.", "Lavo mi camisa blanca.", "Pongo zapatos en la maleta.", "preparing clothes for a day or trip", "verb plus clothing"),
        day("Mini forecast", "A forecast combines weather, season, clothing, and advice.", ["hoy", "mañana", "clima", "usa", "necesitas", "chaqueta"], "Hoy hace frío; necesitas chaqueta.", "Mañana llueve en la mañana.", "Usa zapatos cómodos.", "giving a simple forecast", "weather and clothing advice"),
    ],
    "likes-hobbies": [
        day("Gustar singular", "Me gusta often means one thing pleases me.", ["me gusta", "te gusta", "le gusta", "el libro", "la música", "la comida"], "Me gusta la música.", "¿Te gusta el libro?", "A ella le gusta la comida.", "saying one preference", "gustar plus singular noun"),
        day("Gustar plural", "Use gustan when plural things are pleasing.", ["me gustan", "te gustan", "le gustan", "los libros", "las películas", "los tacos"], "Me gustan los libros.", "¿Te gustan las películas?", "A él le gustan los tacos.", "talking about several liked things", "gustan plus plural noun"),
        day("Encantar and interesar", "Encantar is stronger than gustar; interesar shows interest.", ["me encanta", "me interesa", "te encanta", "le interesa", "mucho", "poco"], "Me encanta la música.", "Me interesa la historia.", "¿Te encanta bailar?", "ranking interests", "strong or mild preference"),
        day("Music and dance", "Hobby nouns and verbs make preferences personal.", ["música", "canción", "bailar", "cantar", "guitarra", "ritmo"], "Me gusta bailar salsa.", "Canto una canción en español.", "Me interesa la guitarra.", "talking about music hobbies", "hobby word plus preference"),
        day("Sports", "Sports often use jugar a or practicar.", ["fútbol", "béisbol", "baloncesto", "correr", "nadar", "equipo"], "Me gusta jugar al fútbol.", "Practico natación los sábados.", "Mi equipo es bueno.", "talking about sports", "sport and activity verb"),
        day("Free time", "Tiempo libre phrases help you talk about normal life.", ["tiempo libre", "leer", "ver", "caminar", "descansar", "salir"], "En mi tiempo libre leo.", "Me gusta salir con amigos.", "A veces descanso en casa.", "describing free-time habits", "free-time verb"),
        day("También / tampoco", "También agrees with a positive idea; tampoco agrees with a negative idea.", ["también", "tampoco", "sí", "no", "igual", "diferente"], "Me gusta el café también.", "No me gusta correr tampoco.", "Mi gusto es diferente.", "agreeing or disagreeing about likes", "también or tampoco"),
        day("Reasons with porque", "Porque gives a simple reason for a preference.", ["porque", "divertido", "aburrido", "fácil", "difícil", "relajante"], "Me gusta nadar porque es relajante.", "No me gusta correr porque es difícil.", "La música es divertida.", "giving reasons for likes", "porque plus adjective"),
        day("Invitations and hobbies", "Hobby invitations combine querer, ir, and activity verbs.", ["¿quieres?", "vamos", "jugar", "bailar", "ver", "conmigo"], "¿Quieres bailar conmigo?", "Vamos a ver una película.", "Quiero jugar fútbol hoy.", "inviting someone to do a hobby", "invitation and activity"),
        day("Preference summary", "A preference summary compares likes, dislikes, hobbies, and reasons.", ["me gusta", "me gustan", "no me gusta", "prefiero", "porque", "tiempo libre"], "Me gustan los deportes, pero prefiero música.", "No me gusta correr porque es difícil.", "En mi tiempo libre leo.", "summarizing personal hobbies", "several preferences with reasons"),
    ],
    "shopping-needs": [
        day("Querer", "Querer is high-frequency for wants and polite shopping needs.", ["quiero", "quieres", "quiere", "queremos", "algo", "nada"], "Quiero una camisa azul.", "¿Quieres algo de la tienda?", "No quiero nada caro.", "saying what you want", "querer plus item"),
        day("Necesitar", "Necesitar is direct and useful for errands.", ["necesito", "necesitas", "necesita", "necesitamos", "ahora", "hoy"], "Necesito comprar comida hoy.", "¿Necesitas zapatos?", "Necesitamos agua ahora.", "saying practical needs", "necesitar plus item/action"),
        day("Comprar, vender, pagar", "Shopping verbs describe the basic exchange.", ["comprar", "vender", "pagar", "dinero", "tarjeta", "efectivo"], "Quiero pagar con tarjeta.", "La tienda vende pan.", "Compro comida con efectivo.", "buying and paying", "payment words"),
        day("Store departments", "Department words help you find items quickly.", ["panadería", "farmacia", "mercado", "ropa", "zapatería", "caja"], "Voy a la farmacia.", "La caja está cerca.", "Compro zapatos en la zapatería.", "finding a store section", "department/place words"),
        day("Price and cost", "Cost questions use cuánto cuesta for one item.", ["¿cuánto cuesta?", "cuesta", "precio", "barato", "caro", "oferta"], "¿Cuánto cuesta esta camisa?", "El precio es caro.", "La fruta está en oferta.", "asking prices", "cost question and answer"),
        day("Quantities", "Quantities make shopping lists precise.", ["uno", "dos", "medio", "kilo", "bolsa", "botella"], "Necesito dos botellas de agua.", "Quiero medio kilo de arroz.", "Compro una bolsa de pan.", "making a shopping list", "quantity plus noun"),
        day("More and less", "Más and menos help compare needs and prices.", ["más", "menos", "mejor", "peor", "grande", "pequeño"], "Necesito una talla más grande.", "Quiero menos azúcar.", "Este precio es mejor.", "adjusting an order", "más/menos plus item or adjective"),
        day("Ask for help", "Polite help phrases keep shopping interactions clear.", ["ayuda", "busco", "tiene", "hay", "disculpe", "puede"], "Disculpe, busco una chaqueta.", "¿Tiene agua fría?", "¿Puede ayudarme?", "asking an employee for help", "polite opening and item"),
        day("Problems and returns", "Simple problem words prepare you for mistakes.", ["problema", "recibo", "cambiar", "devolver", "roto", "equivocado"], "Tengo un problema con el recibo.", "Quiero cambiar esta camisa.", "El zapato está roto.", "explaining a shopping problem", "problem word and desired action"),
        day("Shopping dialogue", "A shopping dialogue combines wants, needs, price, help, and thanks.", ["quiero", "necesito", "cuesta", "pagar", "gracias", "recibo"], "Quiero esta camisa. ¿Cuánto cuesta?", "Necesito pagar con tarjeta.", "Gracias, quiero el recibo.", "completing a store interaction", "request, price, payment, closing"),
    ],
    "core-500-checkpoint": [
        day("Checkpoint: greetings", "Review greetings, names, courtesy, sounds, and survival phrases.", ["hola", "me llamo", "gracias", "perdón", "repita", "despacio"], "Hola, me llamo Ana. Repita, por favor.", "Mucho gusto. Gracias por la ayuda.", "No entiendo; más despacio, por favor.", "restarting a simple conversation", "greeting, name, and help phrase"),
        day("Checkpoint: identity", "Review who you are, where you live, languages, age, and adjectives.", ["soy", "vivo", "hablo", "tengo", "años", "amable"], "Soy estudiante y vivo en Quito.", "Tengo veinte años y hablo inglés.", "Soy una persona amable.", "giving a beginner self-introduction", "identity facts"),
        day("Checkpoint: numbers/time", "Review numbers, dates, clock time, and schedules.", ["lunes", "mayo", "hora", "treinta", "mañana", "cita"], "El lunes tengo una cita a las tres.", "Hoy es el cinco de mayo.", "Trabajo treinta minutos mañana.", "planning with time details", "number, day, and time"),
        day("Checkpoint: family/people", "Review family, descriptions, possessives, feelings, and age.", ["madre", "hermano", "mi", "tiene", "simpático", "está"], "Mi hermano tiene quince años.", "Mi madre está contenta.", "Mi familia es simpática.", "introducing people close to you", "family noun and description"),
        day("Checkpoint: home/class", "Review rooms, objects, colors, articles, hay, and locations.", ["casa", "mesa", "cuaderno", "azul", "hay", "sobre"], "Hay un cuaderno azul sobre la mesa.", "Mi casa tiene una sala pequeña.", "Necesito una pluma negra.", "describing a study space", "object, color, location"),
        day("Checkpoint: food/drink", "Review meals, foods, drinks, ordering, prices, hunger, and likes.", ["desayuno", "agua", "arroz", "quiero", "hambre", "cuesta"], "Tengo hambre y quiero arroz.", "El agua cuesta dos pesos.", "Me gusta el desayuno con café.", "ordering or planning food", "food, need, and price"),
        day("Checkpoint: routines", "Review present -ar verbs, frequency, questions, and sequences.", ["estudio", "trabajo", "camino", "siempre", "después", "¿cuándo?"], "Siempre estudio por la mañana.", "Después trabajo y camino a casa.", "¿Cuándo practicas español?", "describing and asking about routines", "present-tense action"),
        day("Checkpoint: places/ir", "Review places, ir forms, al/a la, transport, purpose, and directions.", ["voy", "al", "a la", "parque", "bus", "derecha"], "Voy al parque en bus.", "Vamos a la tienda a comprar comida.", "La escuela está a la derecha.", "explaining where you go", "ir plus place"),
        day("Checkpoint: weather/clothes/likes", "Review weather, clothes, colors, gustar, hobbies, and reasons.", ["hace frío", "chaqueta", "me gusta", "porque", "bailar", "azul"], "Hace frío; uso una chaqueta azul.", "Me gusta bailar porque es divertido.", "No me gusta la lluvia.", "sharing preferences for weather and activities", "opinion plus reason"),
        day("Checkpoint: 120-day can-do", "Synthesize the first 500-ish core words into one useful beginner exchange.", ["soy", "tengo", "quiero", "voy", "me gusta", "necesito"], "Soy estudiante; necesito practicar español.", "Voy a la tienda y quiero agua.", "Me gusta caminar con mi familia.", "showing what you can now do", "identity, need, place, and preference"),
    ],
    "past-basics": [
        day("Pretérito idea", "The pretérito talks about completed past actions.", ["ayer", "anoche", "la semana pasada", "terminé", "fui", "hice"], "Ayer terminé la tarea.", "Anoche fui al mercado.", "La semana pasada hice comida.", "naming completed past actions", "past time marker"),
        day("Yo -ar past", "For regular -ar verbs, yo often ends in -é in the pretérito.", ["hablé", "estudié", "trabajé", "compré", "caminé", "cociné"], "Ayer estudié español.", "Compré pan en la tienda.", "Caminé al parque.", "saying what you did yesterday", "yo past verb ending in -é"),
        day("Él/ella -ar past", "For él/ella/usted, regular -ar past often ends in -ó.", ["habló", "estudió", "trabajó", "compró", "caminó", "cocinó"], "Ella trabajó ayer.", "Mi padre compró café.", "Usted habló muy claro.", "reporting what someone did", "third-person past ending in -ó"),
        day("Fui: went/was", "Fui can mean I went or I was; context tells the meaning.", ["fui", "fuiste", "fue", "fuimos", "ayer", "allí"], "Ayer fui al banco.", "La clase fue interesante.", "Fuimos al parque.", "using fui/fue for went or was", "context and place/description"),
        day("Tener past: tuve", "Tuve is the past of tener for yo: I had.", ["tuve", "tuviste", "tuvo", "problema", "tiempo", "hambre"], "Ayer tuve hambre.", "Tuve un problema en la tienda.", "Ella tuvo tiempo libre.", "saying what someone had", "tuve/tuvo plus noun"),
        day("Hacer past: hice", "Hice is the past of hacer for yo: I did or made.", ["hice", "hiciste", "hizo", "tarea", "comida", "ejercicio"], "Hice la tarea anoche.", "Mi mamá hizo comida.", "¿Qué hiciste ayer?", "talking about things made or done", "hacer past form"),
        day("-er/-ir yo past", "Many -er and -ir verbs use -í for yo in the pretérito.", ["comí", "bebí", "viví", "escribí", "aprendí", "salí"], "Comí arroz ayer.", "Bebí agua en la tarde.", "Escribí cinco frases.", "naming completed eating, drinking, or writing", "yo past ending in -í"),
        day("Past time markers", "Time markers help listeners hear that the action is finished.", ["ayer", "anoche", "anteayer", "el lunes", "en la mañana", "después"], "El lunes compré fruta.", "Anoche estudié en casa.", "Después comí con mi familia.", "anchoring past events", "time marker before or after action"),
        day("¿Qué hiciste?", "Past questions let you ask about completed actions.", ["¿qué hiciste?", "¿adónde fuiste?", "¿cuándo?", "¿con quién?", "respondí", "pregunté"], "¿Qué hiciste ayer? Estudié.", "¿Adónde fuiste? Fui al mercado.", "Pregunté y respondí en español.", "asking and answering about yesterday", "question word and past verb"),
        day("Past mini-story", "A past story uses time markers, two or three actions, and a result.", ["ayer", "fui", "compré", "comí", "hablé", "después"], "Ayer fui al mercado y compré pan.", "Después comí con mi familia.", "Hablé español con un amigo.", "telling a short completed story", "ordered past actions"),
    ],
    "travel-out": [
        day("Station and airport", "Travel places prepare you for signs and simple questions.", ["aeropuerto", "estación", "boleto", "pasaporte", "maleta", "salida"], "Necesito mi pasaporte en el aeropuerto.", "Compro un boleto en la estación.", "La salida es a las ocho.", "starting a trip", "travel document or place"),
        day("Hotel basics", "Hotel phrases use tener, querer, and necesitar.", ["hotel", "habitación", "reserva", "llave", "noche", "recepción"], "Tengo una reserva.", "Necesito la llave de la habitación.", "Quiero una habitación por una noche.", "checking in at a hotel", "reservation and room words"),
        day("Restaurant order", "Restaurant Spanish combines food, politeness, and payment.", ["mesa", "menú", "mesero", "orden", "cuenta", "propina"], "Quisiera el menú, por favor.", "La orden es para dos personas.", "La cuenta, por favor.", "ordering at a restaurant", "menu/order/check words"),
        day("Directions out", "Travel directions need landmarks and polite commands.", ["mapa", "calle", "avenida", "derecha", "izquierda", "cerca"], "¿Dónde está la avenida principal?", "Gire a la izquierda en la calle.", "El hotel está cerca.", "asking for directions", "landmark and direction"),
        day("Tickets and reservations", "Reservations combine dates, numbers, and names.", ["reservar", "confirmar", "boleto", "fecha", "nombre", "asiento"], "Quiero reservar un asiento.", "Necesito confirmar la fecha.", "El boleto está a mi nombre.", "booking travel or an event", "reservation detail"),
        day("Problems and emergencies", "Use clear, direct phrases for safety and help.", ["ayuda", "emergencia", "perdido", "enfermo", "policía", "doctor"], "Necesito ayuda; estoy perdido.", "Es una emergencia.", "Busco un doctor.", "getting urgent help", "help word and problem"),
        day("Plans with friends", "Going out often starts with time, place, and invitation.", ["salir", "cenar", "reunirse", "amigos", "a las", "lugar"], "Quiero salir con amigos.", "Vamos a cenar a las siete.", "¿Dónde nos reunimos?", "making plans to go out", "time and meeting place"),
        day("Polite requests", "Polite travel requests use puede and quisiera.", ["puede", "podría", "quisiera", "traer", "mostrar", "recomendar"], "¿Puede recomendar un restaurante?", "Quisiera ver el menú.", "¿Podría mostrarme el mapa?", "asking staff for help", "polite verb and request"),
        day("Travel past recap", "Travel stories often use fui, compré, comí, vi, and hablé.", ["fui", "compré", "comí", "vi", "hablé", "visité"], "Fui al museo y vi arte.", "Compré un boleto y visité el centro.", "Comí tacos y hablé español.", "recapping an outing", "past travel verbs"),
        day("Full going-out dialogue", "A complete outing dialogue includes invitation, destination, order, problem, and thanks.", ["vamos", "quisiera", "cuenta", "dirección", "ayuda", "gracias"], "Vamos al restaurante a las siete.", "Quisiera agua y la cuenta, por favor.", "Gracias por la ayuda con la dirección.", "going out from invitation to closing", "sequence of practical exchanges"),
    ],
    "plans-deeper": [
        day("Ir a + infinitive", "Ir a plus an infinitive expresses near future plans.", ["voy a", "vas a", "va a", "vamos a", "estudiar", "comer"], "Voy a estudiar español mañana.", "Vamos a comer en casa.", "Ella va a trabajar.", "saying future plans", "ir form plus infinitive"),
        day("Learning goals", "Goal language helps you steer your next stage in Spanish.", ["meta", "aprender", "mejorar", "practicar", "entender", "conversar"], "Mi meta es conversar más.", "Voy a practicar cada día.", "Quiero entender videos simples.", "describing study goals", "goal noun and future action"),
        day("Comparisons", "Comparisons help you explain progress and preferences.", ["más", "menos", "mejor", "peor", "que", "tan"], "Hoy hablo más rápido que ayer.", "Esta lección es mejor para mí.", "Necesito menos inglés.", "comparing your Spanish skills", "comparison word"),
        day("Connectors", "Connectors make beginner sentences flow.", ["pero", "porque", "cuando", "entonces", "también", "aunque"], "Quiero hablar, pero estoy nervioso.", "Practico porque quiero mejorar.", "Cuando escucho, escribo palabras.", "linking ideas", "connector plus two ideas"),
        day("Opinions with creo que", "Creo que lets you state opinions without sounding absolute.", ["creo que", "pienso que", "para mí", "importante", "posible", "difícil"], "Creo que practicar es importante.", "Para mí, escuchar es difícil.", "Pienso que es posible mejorar.", "sharing opinions about learning", "opinion phrase"),
        day("Experiences", "Experience language bridges present and past.", ["experiencia", "aprendí", "visité", "probé", "conocí", "recordé"], "Aprendí muchas palabras nuevas.", "Probé comida mexicana.", "Conocí a una persona amable.", "describing what you have experienced", "past verb and detail"),
        day("Study strategy in Spanish", "Talk about how you learn using simple Spanish.", ["repasar", "recordar", "escribir", "escuchar", "leer", "hablar"], "Primero escucho; después escribo.", "Repaso palabras y hablo en voz alta.", "Quiero recordar frases útiles.", "explaining your practice routine", "strategy verb"),
        day("Conversation repair", "Repair phrases keep a conversation alive.", ["¿cómo se dice?", "no sé", "quiero decir", "puede repetir", "más lento", "entiendo"], "¿Cómo se dice receipt en español?", "Quiero decir otra cosa.", "¿Puede repetir más lento?", "fixing confusion in conversation", "repair phrase and clarification"),
        day("150-day portfolio", "A portfolio proves what you can do and shows gaps honestly.", ["puedo", "todavía", "necesito", "logro", "reto", "próximo"], "Puedo presentarme y pedir comida.", "Todavía necesito practicar el pasado.", "Mi próximo reto es escuchar más.", "summarizing your progress", "can-do and next challenge"),
        day("Next 30-day plan", "Finish by planning continued input, retrieval, and real communication.", ["plan", "cada día", "escuchar", "hablar", "leer", "escribir"], "Voy a escuchar español cada día.", "También voy a escribir cinco frases.", "Mi plan es hablar con una persona.", "setting a realistic next plan", "specific future actions"),
    ],
}


def word_count(text: str) -> int:
    return len(re.findall(r"[\wÁÉÍÓÚÜÑáéíóúüñ'-]+", text))


def build_review(src: dict) -> str:
    return (
        f"{src['cue']} Key words: {', '.join(src['words'])}. "
        f"Model: {src['model']} Latin American Spanish uses tú/usted; no vosotros. "
        "Use comprehensible input first, then retrieval: understand, cover, and rebuild from memory."
    )


def build_task(src: dict, minutes: int) -> dict:
    return {
        "do": (
            "Take one quick look, then cover the list. Say the target words aloud from "
            f"memory, write 6 Spanish lines for {src['scenario']}, and read them aloud "
            f"twice. Use “{src['model']}” at least twice; keep it simple and Latin American."
        ),
        "capture": (
            "Write your 6 lines, mark the hardest word, and add one English note about "
            "what you could say faster tomorrow."
        ),
        "minutes": minutes,
    }


def build_checks(src: dict) -> list[dict]:
    words = ", ".join(src["words"][:5])
    return [
        {
            "q": "In English, what can today's model help you do? Include one Spanish example.",
            "rubric": (
                "correct: clearly explains the communication goal and gives a relevant Spanish "
                "example; mostly_correct: goal is clear but the Spanish has minor errors; "
                "mostly_wrong: some relevant idea but missing the Spanish example or mostly English; "
                "incorrect: no clear goal, no Spanish example, or meaning is unrelated."
            ),
            "exemplar": f"It helps me handle {src['scenario']}. Example: {src['sample']}",
        },
        {
            "q": f"Write two new Spanish lines using at least three of these target words: {words}.",
            "rubric": (
                "correct: two understandable Spanish lines use at least three target words; "
                "mostly_correct: one line is strong or minor agreement/spelling errors remain; "
                "mostly_wrong: only fragments or one weak line with missing target words; "
                "incorrect: mostly English, copied only, or target words are missing."
            ),
            "exemplar": f"{src['sample']} {src['sample2']}",
        },
        {
            "q": "For a real conversation, what would you say first, and what would you listen for in the reply?",
            "rubric": (
                "correct: gives a practical Spanish first line and a realistic listening target; "
                "mostly_correct: one part is specific and the other is vague; "
                "mostly_wrong: a related idea but not a usable first line or listening target; "
                "incorrect: answer does not prepare for an actual exchange."
            ),
            "exemplar": f'I would say: "{src["sample"]}" I would listen for {src["listen"]}.',
        },
    ]


def build_subject(subject_id: str, title: str, order: int, lesson: str) -> dict:
    src_days = DAY_DATA[subject_id]
    days = []
    for index, src in enumerate(src_days):
        minutes = 10 + (index % 3) * 2
        days.append(
            {
                "focus": src["focus"],
                "review": build_review(src),
                "task": build_task(src, minutes),
                "check": build_checks(src),
            }
        )
    return {
        "id": subject_id,
        "title": title,
        "order": order,
        "lesson": lesson,
        "days": days,
    }


def validate(subjects: list[dict]) -> None:
    if len(subjects) != 15:
        raise ValueError(f"expected 15 subjects, found {len(subjects)}")

    expected_ids = [meta[0] for meta in SUBJECTS_META]
    actual_ids = [subject["id"] for subject in subjects]
    if actual_ids != expected_ids:
        raise ValueError(f"subject id/order mismatch: {actual_ids}")

    for subject in subjects:
        required_subject_keys = {"id", "title", "order", "lesson", "days"}
        if set(subject) != required_subject_keys:
            raise ValueError(f"{subject['id']}: subject keys are not exact")
        if len(subject["days"]) != 10:
            raise ValueError(f"{subject['id']}: expected 10 days")
        for day_index, item in enumerate(subject["days"], start=1):
            if set(item) != {"focus", "review", "task", "check"}:
                raise ValueError(f"{subject['id']} day {day_index}: day keys are not exact")
            if word_count(item["review"]) > 100:
                raise ValueError(f"{subject['id']} day {day_index}: review exceeds 100 words")
            task = item["task"]
            if set(task) != {"do", "capture", "minutes"}:
                raise ValueError(f"{subject['id']} day {day_index}: task keys are not exact")
            if not 10 <= task["minutes"] <= 15:
                raise ValueError(f"{subject['id']} day {day_index}: minutes outside 10-15")
            checks = item["check"]
            if len(checks) != 3:
                raise ValueError(f"{subject['id']} day {day_index}: expected 3 checks")
            for check_index, check in enumerate(checks, start=1):
                if set(check) != {"q", "rubric", "exemplar"}:
                    raise ValueError(
                        f"{subject['id']} day {day_index} check {check_index}: check keys are not exact"
                    )
                if "choices" in check:
                    raise ValueError(f"{subject['id']} day {day_index}: choices field is not allowed")


def main() -> int:
    subjects = [build_subject(*meta) for meta in SUBJECTS_META]
    validate(subjects)

    CURRICULUM_DIR.mkdir(parents=True, exist_ok=True)
    for old_path in CURRICULUM_DIR.glob("*.json"):
        old_path.unlink()

    created = []
    for subject in subjects:
        path = CURRICULUM_DIR / f"{subject['id']}.json"
        path.write_text(
            json.dumps(subject, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        created.append(path.relative_to(ROOT).as_posix())

    goal_days = sum(len(subject["days"]) for subject in subjects)
    print(f"Generated {len(created)} curriculum files with goalDays={goal_days}.")
    for path in created:
        print(f"  - {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
