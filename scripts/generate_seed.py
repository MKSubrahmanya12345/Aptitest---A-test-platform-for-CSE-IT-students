#!/usr/bin/env python3
"""Reproducible demo bank; original reports are preserved and provenance is explicit."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
rows = []

def add(text, answer, solution, category='Quantitative Aptitude', subcategory='Arithmetic', difficulty='basic', kind='numeric', options=None, config=None):
    rows.append(dict(category=category, subcategory=subcategory, difficulty=difficulty,
                     question_type=kind, question_text=text, options=options or {}, correct_answer=answer,
                     grading_config=config or {}, solution=solution, status='active', source_ref=f'demo-curated-{len(rows)+1:03d}'))

for item in json.loads((ROOT / 'server/bedrock-report-1785356134001.json').read_text()):
    approved = item['action'] == 'approved'
    rows.append(dict(category='Quantitative Aptitude', subcategory='Original question bank',
                     difficulty='intermediate' if item['id'] >= 7300 else 'basic',
                     question_type=item['newType'], question_text=item['originalText'], options={},
                     correct_answer=item['newAnswer'] if approved else item['originalAnswer'],
                     grading_config={'allow_decimal_equivalent': True} if item['newType'] == 'fraction' else {},
                     solution='Imported from the original repository report. Accepted answer: ' + json.dumps(item['newAnswer'] if approved else item['originalAnswer']),
                     status='active' if approved else 'pending', source_ref='legacy-report-' + str(item['id'])))

for i in range(1, 16):
    amount, percent = 80 + 20*i, 5*i
    add(f'Find {percent}% of {amount}.', {'value': amount*percent/100}, f'Percentage = {amount} × {percent} / 100 = {amount*percent/100:g}.', subcategory='Percentages')
    principal, rate = 1000 + 200*i, 5+i
    years = 2
    add(f'₹{principal} is invested at {rate}% compound interest annually for {years} years. Find the interest earned.',
        {'value': round(principal*((1+rate/100)**2-1), 2)},
        f'Interest = P[(1 + r/100)^2 − 1] = ₹{round(principal*((1+rate/100)**2-1),2):.2f}.', subcategory='Compound interest', difficulty='intermediate', config={'tolerance':0.01})
    start, step = i*3, i+2
    add(f'Find the next number: {start}, {start+step}, {start+2*step}, {start+3*step}, __.',
        {'value': start+4*step}, f'The common difference is {step}. Add it to {start+3*step}.',
        category='Logical Reasoning', subcategory='Number series')
    add(f'Find the next term: {i+1}, {i+4}, {i+9}, {i+16}, __.',
        {'value': i+25}, f'Terms are {i} + n², for n = 1, 2, 3, 4, 5. The next term is {i} + 25.',
        category='Logical Reasoning', subcategory='Number series', difficulty='advanced')
    value = 16+i*3
    add(f'Convert the binary number {value:b} to decimal.', {'value': value},
        f'Sum each binary digit multiplied by its corresponding power of 2: {value:b}₂ = {value}₁₀.',
        category='CSE Fundamentals', subcategory='Number systems', difficulty='intermediate')
    a,b = i+4,i+7
    add(f'For integers a = {a} and b = {b}, find a XOR b (bitwise exclusive OR).', {'value':a^b},
        f'{a:b} XOR {b:b} = {a^b:b} in binary, which is {a^b}.', category='Programming Concepts', subcategory='Bitwise operations',difficulty='advanced')

mcqs = [
('Which data structure uses FIFO order?', ['Stack','Queue','Tree','Graph'], 'B', 'A queue removes items in the order in which they were inserted.', 'Data structures','basic'),
('Which data structure uses LIFO order?', ['Queue','Stack','Heap','Linked list only'], 'B', 'A stack removes the most recently inserted item first.', 'Data structures','basic'),
('What is the worst-case time complexity of binary search on a sorted array?', ['O(1)','O(log n)','O(n)','O(n²)'], 'B', 'Each comparison halves the search interval.', 'Algorithms','intermediate'),
('Which SQL command retrieves rows from a table?', ['UPDATE','DELETE','SELECT','DROP'], 'C', 'SELECT retrieves data without changing it.', 'Databases','basic'),
('Which constraint uniquely identifies each row in a relational table?', ['DEFAULT','PRIMARY KEY','CHECK','ORDER BY'], 'B', 'A primary key must be unique and non-null.', 'Databases','basic'),
('Which HTTP method is defined as safe and is normally used to retrieve a resource?', ['POST','PATCH','GET','DELETE'], 'C', 'GET is defined as safe and idempotent.', 'Networking','basic'),
('Which Java keyword prevents a class from being extended?', ['static','final','abstract','volatile'], 'B', 'A final class cannot be subclassed.', 'Java','basic'),
('Which OS mechanism gives each process its own logical address space?', ['Virtual memory','Spooling','Polling','Defragmentation'], 'A', 'Virtual memory maps per-process virtual addresses to physical memory.', 'Operating systems','intermediate'),
('Which sorting algorithm guarantees O(n log n) time in the worst case?', ['Bubble sort','Insertion sort','Merge sort','Selection sort'], 'C', 'Merge sort divides and merges in O(n log n) worst-case time.', 'Algorithms','intermediate'),
('Which normal form removes partial dependencies on a composite candidate key?', ['1NF','2NF','Only 4NF','No normal form'], 'B', 'Second normal form requires 1NF and no partial dependency of a non-prime attribute on a candidate key.', 'Databases','intermediate'),
('Which protocol provides reliable, ordered byte-stream transport?', ['UDP','IP','TCP','ARP'], 'C', 'TCP provides reliable, ordered delivery using sequence numbers and acknowledgements.', 'Networking','basic'),
('What does JVM stand for?', ['Java Variable Method','Java Virtual Machine','Joint Virtual Memory','Java Visual Model'], 'B', 'The JVM executes Java bytecode.', 'Java','basic'),
('Which traversal of a binary search tree visits keys in ascending order?', ['Preorder','Postorder','Inorder','Level order'], 'C', 'Inorder visits the left subtree, root, and then right subtree.', 'Data structures','intermediate'),
('Which algorithm finds shortest paths from one source when every edge weight is non-negative?', ['Dijkstra’s algorithm','Binary search','Kruskal’s algorithm only','Heap sort'], 'A', 'Dijkstra’s greedy choice is valid for non-negative weights.', 'Algorithms','advanced'),
('What is the maximum number of edges in a simple undirected graph with n vertices?', ['n','n−1','n(n−1)/2','n²+n'], 'C', 'Each unordered pair of distinct vertices contributes at most one edge.', 'Discrete mathematics','intermediate'),
('Which property of a database transaction means that either all its changes happen or none do?', ['Isolation','Durability','Atomicity','Indexing'], 'C', 'Atomicity makes a transaction an indivisible unit of work.', 'Databases','intermediate'),
('Which Java collection does not allow duplicate elements?', ['List','Set','ArrayList','Vector'], 'B', 'Set models a collection of distinct elements.', 'Java','basic'),
('Which scheduling algorithm can cause starvation if short jobs keep arriving?', ['First come first served','Shortest job first','Round robin with a fixed quantum','FIFO without priorities'], 'B', 'Long jobs may wait indefinitely in shortest-job-first scheduling.', 'Operating systems','advanced'),
('What is the worst-case lookup time in an unbalanced binary search tree with n nodes?', ['O(1)','O(log n)','O(n)','O(n log n)'], 'C', 'An unbalanced tree can degenerate into a chain of n nodes.', 'Data structures','intermediate'),
('Which SQL join returns only rows with matching keys in both inputs?', ['INNER JOIN','LEFT JOIN','FULL OUTER JOIN','CROSS JOIN'], 'A', 'INNER JOIN includes only matching combinations.', 'Databases','basic'),
]
for text,opts,key,explanation,sub,diff in mcqs:
    add(text,{'value':key},explanation,'CSE Fundamentals',sub,diff,'mcq_single',dict(zip('ABCD',opts)))

for i in range(2, 10):
    add(f'Simplify {3*i}/{6*i}. Give a fraction in lowest terms.', {'numerator':1,'denominator':2},
        f'Divide numerator and denominator by {3*i}: 1/2.', subcategory='Fractions', kind='fraction', config={'allow_decimal_equivalent':True})
    add(f'The ratio of two quantities is {2*i}:{3*i}. Express it in simplest form.', {'values':[2,3]},
        f'Divide both terms by {i} to obtain 2:3.', subcategory='Ratios', difficulty='intermediate',kind='ratio', config={'allow_scaled_equivalent':True})

for text,answer,solution in [
 ('All squares are rectangles. True or false?',True,'A square has four right angles and is therefore a rectangle.'),
 ('Every prime number is odd. True or false?',False,'2 is prime and even.'),
 ('In Java, a class can directly extend more than one class. True or false?',False,'Java classes support single class inheritance; they may implement multiple interfaces.'),
 ('An SQL primary key may contain NULL values. True or false?',False,'Primary-key columns must be non-null.'),
]: add(text,{'value':answer},solution,'CSE Fundamentals','Concept checks',kind='boolean')

for text,values,explanation in [
 ('Which Java keywords are used for exception handling? Select all that apply.', ['A','C'], 'try introduces the protected block; catch handles a matching exception.'),
 ('Which are linear data structures? Select all that apply.', ['A','B'], 'Stacks and queues are linear; trees and general graphs are non-linear.'),
]:
    options={'A':'try','B':'extends','C':'catch','D':'package'} if 'keywords' in text else {'A':'Stack','B':'Queue','C':'Tree','D':'Graph'}
    add(text,{'values':values},explanation,'Programming Concepts','Concept checks','intermediate','mcq_multiple',options)

for text,accepted,explanation,kind in [
 ('Fill in the blank: The Java keyword used to create an object is ____.',['new'],'The new expression allocates and initializes an object.','fill_in_blank'),
 ('Name the algorithmic technique that solves overlapping subproblems and reuses stored results.',['dynamic programming'],'Dynamic programming uses memoization or tabulation.','short_text'),
 ('Fill in the blank: SQL stands for ____ Query Language.',['structured'],'SQL means Structured Query Language.','fill_in_blank'),
 ('Which English word is the opposite of "scarce"? Answer "abundant" or "plentiful".',['abundant','plentiful'],'Scarce means in short supply; abundant means plentiful.','short_text'),
]: add(text,{'answers':accepted},explanation,'Verbal Ability' if 'English' in text else 'Programming Concepts','Terminology','basic',kind)
add('A vehicle covers 150 km in 3 hours. Give its speed with the unit km/h.', {'value':50,'unit':'km/h'},
    'Speed = distance / time = 150/3 = 50 km/h.',kind='numeric_with_unit',config={'unit_required':True,'tolerance':0.01})
add('A shop sold 20, 30, and 40 items on Monday, Tuesday, and Wednesday. Find average daily sales.',{'value':30},
    'Average = (20+30+40)/3 = 30.',subcategory='Data interpretation',kind='data_interpretation')

out=ROOT/'src/main/resources/seed/questions.json'
out.write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
from collections import Counter
print(f'{len(rows)} total questions:',Counter(r['status'] for r in rows))
print('Active difficulty:',Counter(r['difficulty'] for r in rows if r['status']=='active'))
