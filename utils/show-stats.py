# pip install matplotlib

import sys
import subprocess
import csv
import matplotlib.pyplot as plt
from datetime import datetime

def get_commit_history(file_path):
    commit_history = []
    git_log_cmd = f'git log --reverse --pretty=format:"%h %ad" --date=format:"%Y-%m-%d" -- {file_path}'
    try:
        log_output = subprocess.check_output(git_log_cmd, shell=True, text=True)
        commit_history = [line.strip().split() for line in log_output.split('\n') if line]
    except subprocess.CalledProcessError as e:
        print("Error:", e)
    return commit_history

def get_line_count(commit_hash, file_path):
    git_show_cmd = f'git show {commit_hash}:{file_path}'
    try:
        show_output = subprocess.check_output(git_show_cmd, shell=True, text=True)
        line_count = len(show_output.split('\n'))
        return line_count
    except subprocess.CalledProcessError as e:
        print("Error:", e)
        return 0

def gather_data_from_file(file_path, data):
    commit_history = get_commit_history(file_path)

    for commit_hash, commit_date in commit_history:
        line_count = get_line_count(commit_hash, file_path) - 1 # -1 for header
        if line_count > 0:
            data.append((commit_date, line_count))

def main():
    if len(sys.argv) != 3:
        print("Usage: python show-trend.py <country> <city>")
        return

    country = sys.argv[1]
    city = sys.argv[2]

    data = []

    # before countries split
    gather_data_from_file(f'csv/{city}.csv', data)

    # after countries split
    gather_data_from_file(f'csv/{country}/{city}.csv', data)

    with open('data.csv', 'w', newline='') as csvfile:
        csv_writer = csv.writer(csvfile)
        csv_writer.writerow(['Date', 'Line Count'])
        csv_writer.writerows(data)

    dates, line_counts = zip(*data)

    plt.plot([datetime.strptime(d, "%Y-%m-%d") for d in dates], line_counts)
    plt.xlabel('Date')
    
    plt.ylabel('Number of Items')
    plt.title(f'Number of Items in the {city} Collection Over Time')
    plt.xticks(rotation=45)
    plt.tight_layout()
    plt.show()

if __name__ == '__main__':
    main()