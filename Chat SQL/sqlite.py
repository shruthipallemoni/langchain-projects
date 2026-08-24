import sqlite3

connection=sqlite3.connect("student.db")

cursor=connection.cursor()

cursor.execute("DROP TABLE IF EXISTS student")

cursor.execute('''
  CREATE TABLE IF NOT EXISTS student(name VARCHAR(25),class VARCHAR(25),section VARCHAR(25),marks INT)
''')

cursor.execute("INSERT INTO student VALUES ('Alice', '10', 'A', 95)")
cursor.execute("INSERT INTO student VALUES ('Bob', '10', 'B', 88)")
cursor.execute("INSERT INTO student VALUES ('Charlie', '9', 'A', 91)")
cursor.execute("INSERT INTO student VALUES ('David', '10', 'C', 76)")
cursor.execute("INSERT INTO student VALUES ('Eva', '9', 'B', 84)")

connection.commit()

print("Data Inserted Successfully!!!")

row=cursor.execute('''SELECT * FROM student''')
for r in row:
    print(r)

connection.close()

